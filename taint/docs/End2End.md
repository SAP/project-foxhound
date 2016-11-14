# End2End Tainting

This document describes how taint information for incoming responses is implemented.

In the end2end branch of taintfox, a server can send an additional 'X-Taint' response header containing a serializsed StringTaint instance for the body. See Taint.cpp for more information about the format.

## Firefox Networking 101

First a high level overview of the Firefox network handling.

The main classes:

    nsIInputStream and nsIOutputStream
        Interfaces that describe input/output streams.
        Basically provide a read()/write() method to clients.

    nsIStreamListener
        An interface for classes that wish to receive data from some kind of network ressource. Has the following methods:
        OnStartRequest, OnStopRequest (both inherited from nsIRequestObserver) and OnDataAvailable.
        Much of the data handling is done through this interface.

    nsHttpChannel
        The main consumer class, used on the main application thread. An instance corresponds
        to a request to a server and its respone.
        Clients are expected to provide a StreamListener instance which receives the incoming
        data (body only).
        Sets up a nsInputStreamPump (see below) to forward the received data to its
        nsIStreamListener methods. These will then forward the data to the channel's StreamListener
        instance. This way the channel can compute progress information.

    nsHttpTransaction
        Also represents a request+response pair, but lives on the network thread. Does such things
        as HTTP header parsing. Writes incoming (body) data into a pipe (see below).

    nsHttpConnection
        Represents a connection to an HTTP Server on the network thread. It is notified whenever data
        is available on the associated network socket. Forwards incoming data to the currently
        active nsHttpTransaction instance.

    nsPipe and Pipe input+output stream classes
        A pipe is created for each transaction to store the response content. A nsHttpTransaction will write to the pipe
        (from the socket thread) and a nsHttpChannel will read from it through its input stream.

    nsInputStreamPump
        A stream pump is responsible for pushing data from an input stream (in this case the pipe)
        to the registered StreamListener.
        Essentially responsible for calling OnDataAvailable on the registered nsIStreamListener each
        time the stream becomes readable.

    nsDocumentOpenInfo
        A nsIStreamListener is responsible for detecting the content type of a response
        and finding an appropriate content handler (also a nsIStreamListener) to handle it.
        This is done by iterating over multiple data structures that store
        content handlers and querying whether they can handle the current content type.

    nsURILoader
        Responsible for setting up nsHttpChannel instances to fetch the content of an URI.
        Will register an nsDocumentOpenInfo instance as the channels listener.

XMLHttpRequests will set up an HttpChannel and call AsyncOpen on it, registering itself as the StreamListener.
The document related HTTP transactions will instead go through the nsURILoader for automatic content type handling.

So, starting at the socket file descriptor, the flow of execution is roughly as shown in the next diagram.
The most important methods in each class are printed next to the incoming edge.

                            Socket
                              |
                              | OnInputStreamReadable()
                              |   OnSocketReadable()
                              V
                       nsHttpConnection
                              |
                              | WriteSegments()
                              |   ProcessData()
                              |     HandleContent() (after the header has been fully processed by ParseHead())
                              V
                      nsHttpTransaction
                              |
                              | WriteSegments() (called by nsHttpTransaction before ProcessData(), which then operates directly on the data in the pipe)
       socket thread          V
    ~~~~~~~~~~~~~~~~~~~~   nsPipe and associated input/output streams
     application thread       |
                              | OnInputStreamReady()
                              V
                      nsInputStreamPump
                              |
                              | OnDataAvailable()
                              V
                        nsHttpChannel
                              |
                              | OnDataAvailable()
                              V
                      nsIStreamListener         // Whatever listener was registered when opening the channel
                    XHR      . .   Document
              ................ ...............
              .                              .
              V                              . OnStartRequest()
        nsXMLHttpRequest                     .   DispatchContent()
                                             . OnDataAvailable()
                                             V
                                     nsDocumentOpenInfo
                                             |
                                             | OnDataAvailable()
                                             V
                                     nsIStreamListener         // The one found by nsDocumentOpenInfo


The data flow on the other hand is essentially just WriteSegments in nsHttpTransaction which writes the data into
the write end of the nsPipe instance, then the last nsIStreamListener instance which extracts the data from the read end of the pipe.

## Tainting

To be able to provide taint information for both XHR and "regular" requests, the taint information is extracted early on in the data flow pipeline, by the nsHttpTransaction class. The class has been extended to parse any taint information from the request (for the actual format used see below) and add it to the content pipe. The taint information can then be extracted from the pipe's input stream instance.

Thus the following changes were performed:

    1. Extend nsHttpTransaction to parse the taint information

    2. Add an XCPOM interface: xpcom/io/nsITaintawareInputStream.idl

    3. Make nsPipe and nsPipeInputStream taint aware
        - This is currently a slight hack since there's basically just a nsIPipe::SetTaint() method
          to set the taint information for all the data that will ever be in the pipe.
          This does make things easier though as the taint information is available before the
          actual data arrives.

    4. Extract the taint information in the final nsIStreamListener instances by QueryInterface'ing the input stream to nsITaintawareInputStream

Additionally, the following classes/interfaces have also been modified to support taint propagation

    nsIncrementalStreamLoader: Interface and implementation, mostly used for loading external script data in the browser

## Caveats

Currently, taint propagation into the HTML parser only works for non-compressed responses, since an additional decompression StreamListener is added for compressed streams which isn't taintaware yet. Thus, the end2end Taintfox currently does not send out compression related 'accept' headers. Also the patches for the nsHtml5StreamParser are fairly hackish. The propagation only works correctly if a content type and charset is set for the incoming data. Last, response caching has been disabled as the cache also isn't taint aware yet.

## Testing

There is a small testsuite in taint/misc/. It can be run by starting the run.py script (a small webserver), then navigating to localhost:8000 in Taintfox. The code will test some basic taint propagation from the server into HTML text nodes, JavaScript string literals and XMLHttpRequest responses.
