(function() {
  'use strict';

  // Event handler for Tainfox taint report
  function handleTaintReport(report) {
    console.log("Getting taint export URL");
    browser.tainting.getTaintExportUrl()
        .then((url) => {
            if (url != "") {

                let body_string = JSON.stringify(
                    {
                        detail: report.detail,
                        taint: report.detail.str.taint
                    }
                );

                // fetch is a sink, so untaint to prevent recursive events
                body_string.untaint();

                console.log("Sending Taintflow to " + url);

                fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: body_string
                    })
                    .then((r) => {
                        // Only print something if there is an error response code
                        if (r.status < 200 || r.status >= 300) {
                            console.error("[Taint-Export] Response: " + r.status + "  from:", url, "Full response:", r);
                        }
                    })
                    .catch((e) => {
                        console.error("[Taint-Export] Error exporting taint flows:", e);
                    });
            }            
        })                
        .catch((e) => {
            console.error("[Taint-Export] Error exporting taint flows:", e);
        }); 

  }


  console.info("Starting Taint Export Service");
  // Event listener for Taintfox taint report
  window.addEventListener('__taintreport', handleTaintReport);

})(window);