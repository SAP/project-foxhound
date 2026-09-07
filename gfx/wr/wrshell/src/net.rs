/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use serde::Serialize;
use std::{time, thread};
use std::net::TcpStream;
use tungstenite::{WebSocket, stream::MaybeTlsStream};
use webrender_api::debugger::DebuggerMessage;

// Network interfaces for interacting with a WR remote debugger instance

// Simple HTTP connection used to issue most commands and queries
pub struct HttpConnection {
    host: String,
}

impl HttpConnection {
    pub fn new(host: &str) -> Self {
        let host = format!("http://{}", host);

        HttpConnection {
            host,
        }
    }

    pub fn get(
        &mut self,
        endpoint: &str,
    ) -> Result<Option<String>, String> {
        self.get_with_query(
            endpoint,
            &[],
        )
    }

    pub fn get_with_query(
        &mut self,
        endpoint: &str,
        params: &[(&str, &str)],
    ) -> Result<Option<String>, String> {
        let url = format!("{}/{}", self.host, endpoint);

        match reqwest::blocking::Client::builder()
            .build()
            .expect("bug")
            .get(url)
            .query(params)
            .send() {
            Ok(response) => {
                let text = response.text().expect("no content");
                if text.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(text))
                }
            }
            Err(error) => {
                Err(error.to_string())
            }
        }
    }

    pub fn post_with_content<T: Serialize>(
        &mut self,
        endpoint: &str,
        content: &T,
    ) -> Result<Option<String>, String> {
        let url = format!("{}/{}", self.host, endpoint);
        let body = serde_json::to_string(content).expect("bug");

        match reqwest::blocking::Client::builder()
            .build()
            .expect("bug")
            .post(url)
            .body(body)
            .send() {
            Ok(response) => {
                let text = response.text().expect("no content");
                if text.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(text))
                }
            }
            Err(error) => {
                Err(error.to_string())
            }
        }
    }

    pub fn post(
        &mut self,
        endpoint: &str,
    ) -> Result<Option<String>, String> {
        self.post_with_content(
            endpoint,
            &"",
        )
    }
}

// Network events that can be received from the stream socket
pub enum NetworkEvent {
    Connected,
    Disconnected,
    Message(DebuggerMessage),
}

pub struct NetworkEventStream;

// Thread that connects to a WR instance and reads realtime updates as provided, such as
// profiler updates, debug flag changes etc. The messages are pushed pushed via a callback.
impl NetworkEventStream {
    pub fn spawn<F>(
        host: &str,
        callback: F,
    ) where
        F: Fn(NetworkEvent) + Send + 'static,
    {
        let host = host.to_string();
        let mut connection: Option<WebSocket<MaybeTlsStream<TcpStream>>> = None;

        loop {
            match connection {
                Some(ref mut socket) => {
                    match socket.read() {
                        Ok(msg) => {
                            let msg = match msg {
                                tungstenite::Message::Text(text) => text,
                                _ => todo!(),
                            };
                            let msg: DebuggerMessage = serde_json::from_str(msg.as_str()).expect("bug");
                            callback(NetworkEvent::Message(msg));
                        }
                        Err(..) => {
                            // Connection dropped
                            connection = None;
                            callback(NetworkEvent::Disconnected);
                        }
                    }
                }
                None => {
                    // Try connect
                    let uri = format!("ws://{}/debugger-socket", host);
                    match tungstenite::connect(uri) {
                        Ok((socket, _)) => {
                            // Connected
                            connection = Some(socket);
                            callback(NetworkEvent::Connected);
                        }
                        Err(..) => {
                            // Wait until try again
                            thread::sleep(time::Duration::new(1, 0));
                        }
                    }
                }
            }
        }
    }
}
