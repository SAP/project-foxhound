// valids
const multipleCerts1 =
  "about:certificate?cert=MIIGRjCCBS6gAwIBAgIQDJduPkI49CDWPd%2BG7%2Bu6kDANBgkqhkiG9w0BAQsFADBNMQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMScwJQYDVQQDEx5EaWdpQ2VydCBTSEEyIFNlY3VyZSBTZXJ2ZXIgQ0EwHhcNMTgxMTA1MDAwMDAwWhcNMTkxMTEzMTIwMDAwWjCBgzELMAkGA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcTDU1vdW50YWluIFZpZXcxHDAaBgNVBAoTE01vemlsbGEgQ29ycG9yYXRpb24xDzANBgNVBAsTBldlYk9wczEYMBYGA1UEAxMPd3d3Lm1vemlsbGEub3JnMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuKruymkkmkqCJh7QjmXlUOBcLFRyw5LG%2FvUUWVrsxC2gsbR8WJq%2BcYoYBpoNVStKrO4U2rBh1GEbccvT6qKOQI%2BpjjDxx9cmRdubGTGp8L0MF1ohVvhIvYLumOEoRDDPU4PvGJjGhek%2FojvedPWe8dhciHkxOC2qPFZvVFMwg1%2Fo%2Fb80147BwZQmzB18mnHsmcyKlpsCN8pxw86uao9Iun8gZQrsllW64rTZlRR56pHdAcuGAoZjYZxwS9Z%2BlvrSjEgrddemWyGGalqyFp1rXlVM1Tf4%2FIYWAQXTgTUN303u3xMjss7QK7eUDsACRxiWPLW9XQDd1c%2ByvaYJKzgJ2wIDAQABo4IC6TCCAuUwHwYDVR0jBBgwFoAUD4BhHIIxYdUvKOeNRji0LOHG2eIwHQYDVR0OBBYEFNpSvSGcN2VT%2FB9TdQ8eXwebo60%2FMCcGA1UdEQQgMB6CD3d3dy5tb3ppbGxhLm9yZ4ILbW96aWxsYS5vcmcwDgYDVR0PAQH%2FBAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjBrBgNVHR8EZDBiMC%2BgLaArhilodHRwOi8vY3JsMy5kaWdpY2VydC5jb20vc3NjYS1zaGEyLWc2LmNybDAvoC2gK4YpaHR0cDovL2NybDQuZGlnaWNlcnQuY29tL3NzY2Etc2hhMi1nNi5jcmwwTAYDVR0gBEUwQzA3BglghkgBhv1sAQEwKjAoBggrBgEFBQcCARYcaHR0cHM6Ly93d3cuZGlnaWNlcnQuY29tL0NQUzAIBgZngQwBAgIwfAYIKwYBBQUHAQEEcDBuMCQGCCsGAQUFBzABhhhodHRwOi8vb2NzcC5kaWdpY2VydC5jb20wRgYIKwYBBQUHMAKGOmh0dHA6Ly9jYWNlcnRzLmRpZ2ljZXJ0LmNvbS9EaWdpQ2VydFNIQTJTZWN1cmVTZXJ2ZXJDQS5jcnQwDAYDVR0TAQH%2FBAIwADCCAQIGCisGAQQB1nkCBAIEgfMEgfAA7gB1AKS5CZC0GFgUh7sTosxncAo8NZgE%2BRvfuON3zQ7IDdwQAAABZuYWiHwAAAQDAEYwRAIgZnMSH1JdG6NASHWTwD0mlP%2Fzbr0hzP263c02Ym0DU64CIEe4QHJDP47j0b6oTFu6RrZz1NQ9cq8Az1KnMKRuaFAlAHUAh3W%2F51l8%2BIxDmV%2B9827%2FVo1HVjb%2FSrVgwbTq%2F16ggw8AAAFm5haJAgAABAMARjBEAiAxGLXkUaOAkZhXNeNR3pWyahZeKmSaMXadgu18SfK1ZAIgKtwu5eGxK76rgaszLCZ9edBIjuU0DKorzPUuxUXFY0QwDQYJKoZIhvcNAQELBQADggEBAKLJAFO3wuaP5MM%2Fed1lhk5Uc2aDokhcM7XyvdhEKSHbgPhcgMoT9YIVoPa70gNC6KHcwoXu0g8wt7X6Vm1ql%2F68G5q844kFuC6JPl4LVT9mciD%2BVW6bHUSXD9xifL9DqdJ0Ic0SllTlM%2Boq5aAeOxUQGXhXIqj6fSQv9fQN6mXxQIoc%2Fgjxteskq%2FVl8YmY1FIZP9Bh7g27kxZ9GAAGQtjTL03RzKAuSg6yeImYVdQWasc7UPnBXlRAzZ8%2BOJThUbzK16a2CI3Rg4agKSJk%2BuA47h1%2FImmngpFLRb%2FMvRX6H1oWcUuyH6O7PZdl0YpwTpw1THIuqCGl%2FwpPgyQgcTM%3D&cert=MIIHQjCCBiqgAwIBAgIQCgYwQn9bvO1pVzllk7ZFHzANBgkqhkiG9w0BAQsFADB1MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3d3cuZGlnaWNlcnQuY29tMTQwMgYDVQQDEytEaWdpQ2VydCBTSEEyIEV4dGVuZGVkIFZhbGlkYXRpb24gU2VydmVyIENBMB4XDTE4MDUwODAwMDAwMFoXDTIwMDYwMzEyMDAwMFowgccxHTAbBgNVBA8MFFByaXZhdGUgT3JnYW5pemF0aW9uMRMwEQYLKwYBBAGCNzwCAQMTAlVTMRkwFwYLKwYBBAGCNzwCAQITCERlbGF3YXJlMRAwDgYDVQQFEwc1MTU3NTUwMQswCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZyYW5jaXNjbzEVMBMGA1UEChMMR2l0SHViLCBJbmMuMRMwEQYDVQQDEwpnaXRodWIuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxjyq8jyXDDrBTyitcnB90865tWBzpHSbindG%2FXqYQkzFMBlXmqkzC%2BFdTRBYyneZw5Pz%2BXWQvL%2B74JW6LsWNc2EF0xCEqLOJuC9zjPAqbr7uroNLghGxYf13YdqbG5oj%2F4x%2BogEG3dF%2FU5YIwVr658DKyESMV6eoYV9mDVfTuJastkqcwero%2B5ZAKfYVMLUEsMwFtoTDJFmVf6JlkOWwsxp1WcQ%2FMRQK1cyqOoUFUgYylgdh3yeCDPeF22Ax8AlQxbcaI%2BGwfQL1FB7Jy%2Bh%2BKjME9lE%2FUpgV6Qt2R1xNSmvFCBWu%2BNFX6epwFP%2FJRbkMfLz0beYFUvmMgLtwVpEPSwIDAQABo4IDeTCCA3UwHwYDVR0jBBgwFoAUPdNQpdagre7zSmAKZdMh1Pj41g8wHQYDVR0OBBYEFMnCU2FmnV%2BrJfQmzQ84mqhJ6kipMCUGA1UdEQQeMByCCmdpdGh1Yi5jb22CDnd3dy5naXRodWIuY29tMA4GA1UdDwEB%2FwQEAwIFoDAdBgNVHSUEFjAUBggrBgEFBQcDAQYIKwYBBQUHAwIwdQYDVR0fBG4wbDA0oDKgMIYuaHR0cDovL2NybDMuZGlnaWNlcnQuY29tL3NoYTItZXYtc2VydmVyLWcyLmNybDA0oDKgMIYuaHR0cDovL2NybDQuZGlnaWNlcnQuY29tL3NoYTItZXYtc2VydmVyLWcyLmNybDBLBgNVHSAERDBCMDcGCWCGSAGG%2FWwCATAqMCgGCCsGAQUFBwIBFhxodHRwczovL3d3dy5kaWdpY2VydC5jb20vQ1BTMAcGBWeBDAEBMIGIBggrBgEFBQcBAQR8MHowJAYIKwYBBQUHMAGGGGh0dHA6Ly9vY3NwLmRpZ2ljZXJ0LmNvbTBSBggrBgEFBQcwAoZGaHR0cDovL2NhY2VydHMuZGlnaWNlcnQuY29tL0RpZ2lDZXJ0U0hBMkV4dGVuZGVkVmFsaWRhdGlvblNlcnZlckNBLmNydDAMBgNVHRMBAf8EAjAAMIIBfgYKKwYBBAHWeQIEAgSCAW4EggFqAWgAdgCkuQmQtBhYFIe7E6LMZ3AKPDWYBPkb37jjd80OyA3cEAAAAWNBYm0KAAAEAwBHMEUCIQDRZp38cTWsWH2GdBpe%2FuPTWnsu%2Fm4BEC2%2BdIcvSykZYgIgCP5gGv6yzaazxBK2NwGdmmyuEFNSg2pARbMJlUFgU5UAdgBWFAaaL9fC7NP14b1Esj7HRna5vJkRXMDvlJhV1onQ3QAAAWNBYm0tAAAEAwBHMEUCIQCi7omUvYLm0b2LobtEeRAYnlIo7n6JxbYdrtYdmPUWJQIgVgw1AZ51vK9ENinBg22FPxb82TvNDO05T17hxXRC2IYAdgC72d%2B8H4pxtZOUI5eqkntHOFeVCqtS6BqQlmQ2jh7RhQAAAWNBYm3fAAAEAwBHMEUCIQChzdTKUU2N%2BXcqcK0OJYrN8EYynloVxho4yPk6Dq3EPgIgdNH5u8rC3UcslQV4B9o0a0w204omDREGKTVuEpxGeOQwDQYJKoZIhvcNAQELBQADggEBAHAPWpanWOW%2Fip2oJ5grAH8mqQfaunuCVE%2Bvac%2B88lkDK%2FLVdFgl2B6kIHZiYClzKtfczG93hWvKbST4NRNHP9LiaQqdNC17e5vNHnXVUGw%2ByxyjMLGqkgepOnZ2Rb14kcTOGp4i5AuJuuaMwXmCo7jUwPwfLe1NUlVBKqg6LK0Hcq4K0sZnxE8HFxiZ92WpV2AVWjRMEc%2F2z2shNoDvxvFUYyY1Oe67xINkmyQKc%2BygSBZzyLnXSFVWmHr3u5dcaaQGGAR42v6Ydr4iL38Hd4dOiBma%2BFXsXBIqWUjbST4VXmdaol7uzFMojA4zkxQDZAvF5XgJlAFadfySna%2Fteik%3D";
const multipleCerts2 =
  "about:certificate?cert=MIIIIDCCBwigAwIBAgIQGk0sGNQUuaOL9Rii2XQ4yjANBgkqhkiG9w0BAQsFADBUMQswCQYDVQQGEwJVUzEeMBwGA1UEChMVR29vZ2xlIFRydXN0IFNlcnZpY2VzMSUwIwYDVQQDExxHb29nbGUgSW50ZXJuZXQgQXV0aG9yaXR5IEczMB4XDTE5MDYxODA4MjE1OFoXDTE5MDkxMDA4MTUwMFowZjELMAkGA1UEBhMCVVMxEzARBgNVBAgMCkNhbGlmb3JuaWExFjAUBgNVBAcMDU1vdW50YWluIFZpZXcxEzARBgNVBAoMCkdvb2dsZSBMTEMxFTATBgNVBAMMDCouZ29vZ2xlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABMRScn8kk6qy3LHVktWZWxm%2FMq4kowlEdxQH40wijThZ%2B%2F5Jrqh6UlWnWuiulNorHH2DEW4OkSKreFoYze7w8O6jggWlMIIFoTATBgNVHSUEDDAKBggrBgEFBQcDATAOBgNVHQ8BAf8EBAMCB4AwggRqBgNVHREEggRhMIIEXYIMKi5nb29nbGUuY29tgg0qLmFuZHJvaWQuY29tghYqLmFwcGVuZ2luZS5nb29nbGUuY29tghIqLmNsb3VkLmdvb2dsZS5jb22CGCouY3Jvd2Rzb3VyY2UuZ29vZ2xlLmNvbYIGKi5nLmNvgg4qLmdjcC5ndnQyLmNvbYIRKi5nY3BjZG4uZ3Z0MS5jb22CCiouZ2dwaHQuY26CFiouZ29vZ2xlLWFuYWx5dGljcy5jb22CCyouZ29vZ2xlLmNhggsqLmdvb2dsZS5jbIIOKi5nb29nbGUuY28uaW6CDiouZ29vZ2xlLmNvLmpwgg4qLmdvb2dsZS5jby51a4IPKi5nb29nbGUuY29tLmFygg8qLmdvb2dsZS5jb20uYXWCDyouZ29vZ2xlLmNvbS5icoIPKi5nb29nbGUuY29tLmNvgg8qLmdvb2dsZS5jb20ubXiCDyouZ29vZ2xlLmNvbS50coIPKi5nb29nbGUuY29tLnZuggsqLmdvb2dsZS5kZYILKi5nb29nbGUuZXOCCyouZ29vZ2xlLmZyggsqLmdvb2dsZS5odYILKi5nb29nbGUuaXSCCyouZ29vZ2xlLm5sggsqLmdvb2dsZS5wbIILKi5nb29nbGUucHSCEiouZ29vZ2xlYWRhcGlzLmNvbYIPKi5nb29nbGVhcGlzLmNughEqLmdvb2dsZWNuYXBwcy5jboIUKi5nb29nbGVjb21tZXJjZS5jb22CESouZ29vZ2xldmlkZW8uY29tggwqLmdzdGF0aWMuY26CDSouZ3N0YXRpYy5jb22CEiouZ3N0YXRpY2NuYXBwcy5jboIKKi5ndnQxLmNvbYIKKi5ndnQyLmNvbYIUKi5tZXRyaWMuZ3N0YXRpYy5jb22CDCoudXJjaGluLmNvbYIQKi51cmwuZ29vZ2xlLmNvbYIWKi55b3V0dWJlLW5vY29va2llLmNvbYINKi55b3V0dWJlLmNvbYIWKi55b3V0dWJlZWR1Y2F0aW9uLmNvbYIRKi55b3V0dWJla2lkcy5jb22CByoueXQuYmWCCyoueXRpbWcuY29tghphbmRyb2lkLmNsaWVudHMuZ29vZ2xlLmNvbYILYW5kcm9pZC5jb22CG2RldmVsb3Blci5hbmRyb2lkLmdvb2dsZS5jboIcZGV2ZWxvcGVycy5hbmRyb2lkLmdvb2dsZS5jboIEZy5jb4IIZ2dwaHQuY26CBmdvby5nbIIUZ29vZ2xlLWFuYWx5dGljcy5jb22CCmdvb2dsZS5jb22CD2dvb2dsZWNuYXBwcy5jboISZ29vZ2xlY29tbWVyY2UuY29tghhzb3VyY2UuYW5kcm9pZC5nb29nbGUuY26CCnVyY2hpbi5jb22CCnd3dy5nb28uZ2yCCHlvdXR1LmJlggt5b3V0dWJlLmNvbYIUeW91dHViZWVkdWNhdGlvbi5jb22CD3lvdXR1YmVraWRzLmNvbYIFeXQuYmUwaAYIKwYBBQUHAQEEXDBaMC0GCCsGAQUFBzAChiFodHRwOi8vcGtpLmdvb2cvZ3NyMi9HVFNHSUFHMy5jcnQwKQYIKwYBBQUHMAGGHWh0dHA6Ly9vY3NwLnBraS5nb29nL0dUU0dJQUczMB0GA1UdDgQWBBT8E5DiGEc7xHswBMF5K5EmFzx6fDAMBgNVHRMBAf8EAjAAMB8GA1UdIwQYMBaAFHfCuFCaZ3Z2sS3ChtCDoH6mfrpLMCEGA1UdIAQaMBgwDAYKKwYBBAHWeQIFAzAIBgZngQwBAgIwMQYDVR0fBCowKDAmoCSgIoYgaHR0cDovL2NybC5wa2kuZ29vZy9HVFNHSUFHMy5jcmwwDQYJKoZIhvcNAQELBQADggEBAGrWCimTdP8%2B6qCqNh1Xza9Wlm%2FGDVb%2BKp0PHUZaNDMThFQQqGn2XVi7ZkhqsxTtMw88Nrl97Bi1OsnNPlabhDwxtRyWkNkLdpFxebRz73CsjyoB3cboH%2FZ8sU9LLwXe%2FIJgMkvT7fznKtKSweWV%2BmAYG%2F3KzaIyLrowYpyOsWaYytPJK7ypuk6yOPxuQcQnelotWpuHUBR3mo3FIW56BPCy20KwqwvWoZe27BNxO%2F11Ym%2FPnric2fWXwgmHdkvVqqssUMFs%2BmG2tS%2FpqnR5yZdQL60xOgDq70mVWYgQT4yUTm7i8qvugvNnuSIjjsbelHgbC8f5%2Fx%2Bo2pEyw%2FDYyKw%3D&cert=MIIGcTCCBVmgAwIBAgIQCHx760AsIFydVjey10GPXTANBgkqhkiG9w0BAQsFADBwMQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3d3cuZGlnaWNlcnQuY29tMS8wLQYDVQQDEyZEaWdpQ2VydCBTSEEyIEhpZ2ggQXNzdXJhbmNlIFNlcnZlciBDQTAeFw0xOTA1MjQwMDAwMDBaFw0yMDA1MjMxMjAwMDBaMHkxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQHEw1TYW4gRnJhbmNpc2NvMRYwFAYDVQQKEw1Ud2l0dGVyLCBJbmMuMQ0wCwYDVQQLEwRhdGxhMRYwFAYDVQQDDA0qLnR3aXR0ZXIuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4IL8Mo0RIfgZmVhwMiaq30EfjJzcB1dalwHZb2K6P6LtmEpLs%2Bnqm1FCdfZgKO3u4CAbd5Oc2EaZB5KjhOcEo6GjhGKcLS430y%2FXhqWo6dDWWYal1Ulu7CCvNLir0Q5aQ2m8EJuafK%2BqwxSBCGXiWeT4HXqabyU34i70bQbgBSjvffaHr27HVrD4hxq0DspKTIpf0fc4%2B%2Fs%2FTTbxEmX7FbVgmu3Y3rTpeNXegL2Lp5nrGp1drWpcM6g8PlrlhcWujdD2Sb0BpIO0dFNCmvOwDspKt8Ih7t0Sw3Q7u0EGEGJLt%2BgY7nrBoRm1G0DSBd0Ih4coHzfgoGBPy11atynvLwIDAQABo4IC%2FDCCAvgwHwYDVR0jBBgwFoAUUWj%2FkK8CB3U8zNllZGKiErhZcjswHQYDVR0OBBYEFNFZBVr1ptzC%2FiUkvSIQ8QAGfB5jMCUGA1UdEQQeMByCDSoudHdpdHRlci5jb22CC3R3aXR0ZXIuY29tMA4GA1UdDwEB%2FwQEAwIFoDAdBgNVHSUEFjAUBggrBgEFBQcDAQYIKwYBBQUHAwIwdQYDVR0fBG4wbDA0oDKgMIYuaHR0cDovL2NybDMuZGlnaWNlcnQuY29tL3NoYTItaGEtc2VydmVyLWc2LmNybDA0oDKgMIYuaHR0cDovL2NybDQuZGlnaWNlcnQuY29tL3NoYTItaGEtc2VydmVyLWc2LmNybDBMBgNVHSAERTBDMDcGCWCGSAGG%2FWwBATAqMCgGCCsGAQUFBwIBFhxodHRwczovL3d3dy5kaWdpY2VydC5jb20vQ1BTMAgGBmeBDAECAjCBgwYIKwYBBQUHAQEEdzB1MCQGCCsGAQUFBzABhhhodHRwOi8vb2NzcC5kaWdpY2VydC5jb20wTQYIKwYBBQUHMAKGQWh0dHA6Ly9jYWNlcnRzLmRpZ2ljZXJ0LmNvbS9EaWdpQ2VydFNIQTJIaWdoQXNzdXJhbmNlU2VydmVyQ0EuY3J0MAwGA1UdEwEB%2FwQCMAAwggEFBgorBgEEAdZ5AgQCBIH2BIHzAPEAdgDuS723dc5guuFCaR%2Br4Z5mow9%2BX7By2IMAxHuJeqj9ywAAAWrrCDXmAAAEAwBHMEUCIQCSwzRMoifj1DjYLJuMOH%2BZ6coX83bWIgWgWynLUED87wIgFKdipP9ycAE8S9apXJxKQyp0RoA%2Ftca5%2BWHQE5VlF68AdwCHdb%2FnWXz4jEOZX73zbv9WjUdWNv9KtWDBtOr%2FXqCDDwAAAWrrCDakAAAEAwBIMEYCIQCcmFOfp58BDMFZZS%2FRVl2uiY94RcTozBrcmtkpoWhgkgIhAN%2BX3ODViV4HnN2ZpZ383mFaEHIjKACRdWTRL%2BcYA43lMA0GCSqGSIb3DQEBCwUAA4IBAQB8LQLmUzevGtdw%2FXVL8aFrotloF3zsUPb2Q7CONLzlMGrmfv%2BNKDXN9xqPLLzmX4MddOjfpbVcDX1mJkuvuYNhh5AQrsaxcfEgfMcqPOdELA1mHPfk8H5a8Tvno1nF9wQWqkCQjLedjKReivmDOGfs1%2Fl%2FDnrprc0v4f28cWvN7YkJsdqfEGLbJ6SKsAxNbtNn%2Ffi6LxnemjLbcTrZYps11Ex55PtDNc200ejqpbpzHolgAew4KUzsyElaYSvDwkLMdmfwYSI9wgcPmrPBfZ0N12TAfmJJbE%2FkZc0jIOi92A%2FVgZLKvQrxadnBqPzAR%2F2SrZMT5joWa5sHpwl9fg5Z";
const multipleCertsWithoutCommonName =
  "about:certificate?cert=MIIDZjCCAu2gAwIBAgISBs352bcilvlGU69E2Cai5rOYMAoGCCqGSM49BAMDMDIxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQswCQYDVQQDEwJFNTAeFw0yNTA4MDYxMDA4MzFaFw0yNTExMDQxMDA4MzBaMAAwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQg5r2Oigxi26r2gvut9Zjvip6uCO3JWzKRBhTkrjSld%2FsRDuA6tIk39y0BjJdoO824XYl4FRwen3UaO2b8eN0Ro4ICEzCCAg8wDgYDVR0PAQH%2FBAQDAgeAMBMGA1UdJQQMMAoGCCsGAQUFBwMBMAwGA1UdEwEB%2FwQCMAAwHwYDVR0jBBgwFoAUnytfzzwhT50Et%2B0rLMTGcIvS1w0wMgYIKwYBBQUHAQEEJjAkMCIGCCsGAQUFBzAChhZodHRwOi8vZTUuaS5sZW5jci5vcmcvMDoGA1UdEQEB%2FwQwMC6CLGV6ZHJwLWZvcm1zLmV6ZHJwLmV6ZC0wMi5jbG91ZC5jdWkucGcuZ2RhLnBsMBMGA1UdIAQMMAowCAYGZ4EMAQIBMC0GA1UdHwQmMCQwIqAgoB6GHGh0dHA6Ly9lNS5jLmxlbmNyLm9yZy8yNS5jcmwwggEDBgorBgEEAdZ5AgQCBIH0BIHxAO8AdQAN4fIwK9MNwUBiEgnqVS78R3R8sdfpMO8OQh60fk6qNAAAAZh%2FECipAAAEAwBGMEQCIC1HAgm0ZEg3p99Sj%2FL0xxvVWkNNmLBC2UZR5cOtUZAfAiAOtvGW2QG5GtDq1b%2BDQC7V79rrDkFuH29MLfWd%2F%2B7nNwB2AN3cyjSV1%2BEWBeeVMvrHn%2Fg9HFDf2wA6FBJ2Ciysu8gqAAABmH8QKOsAAAQDAEcwRQIgGIbmVrZ1MxuQ%2FIF%2B2TCZq%2BHSn8viwaHzludqVAdeqNwCIQC1oK0yeUnw6njmbYIw5ctdJ0HZrP3Ul9QmPlEUkVHcwTAKBggqhkjOPQQDAwNnADBkAjBVlr77bImxyPoGcogIZRmYgXgjySsLc5gWe7Y9ri%2BnEyGaDryDcolGVrS13q4Q3S8CMHWceEmJPrTTIbLlWCd%2FuklGxMIjMo9ZtiRnft%2FGkgD2ct6M4QxuQEj%2B5IYcAx9xww%3D%3D&cert=MIICtDCCAjugAwIBAgIQGG511O6woF39Lagghl0eMTAKBggqhkjOPQQDAzBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yNDAzMTMwMDAwMDBaFw0yNzAzMTIyMzU5NTlaMDIxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQswCQYDVQQDEwJFNTB2MBAGByqGSM49AgEGBSuBBAAiA2IABA0LOoprYY6279xfWOfGQkVUq2P2ZmFICi5ZdbSBAjdQtz8WedyY7KEol3IgHCzP1XxSIE5UeFuEFGvAkK6F7MBRQTxah38GTdT%2BYNH6bC3hfZUQiKIIVA%2BZGkzm6gqs2KOB%2BDCB9TAOBgNVHQ8BAf8EBAMCAYYwHQYDVR0lBBYwFAYIKwYBBQUHAwIGCCsGAQUFBwMBMBIGA1UdEwEB%2FwQIMAYBAf8CAQAwHQYDVR0OBBYEFJ8rX888IU%2BdBLftKyzExnCL0tcNMB8GA1UdIwQYMBaAFHxClq7eS0g7%2BpL4nozPbYupcjeVMDIGCCsGAQUFBwEBBCYwJDAiBggrBgEFBQcwAoYWaHR0cDovL3gyLmkubGVuY3Iub3JnLzATBgNVHSAEDDAKMAgGBmeBDAECATAnBgNVHR8EIDAeMBygGqAYhhZodHRwOi8veDIuYy5sZW5jci5vcmcvMAoGCCqGSM49BAMDA2cAMGQCMBttLkVBHEU%2B2V80GHRnE3m6qym1thBOgydKi0VOx3vP9EAwHWGl5hxtpJAJkm5GSwIwRikYhDR6vPve2BvYGacE9ct%2B522E2dqO6s42MLmigEws5mASS6l2quhtlUfacgkM&cert=MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S%2BHUjAKBggqhkjOPQQDAzBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBTZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW%2B1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9ItgKbppbd9%2Fw%2BkHsOdx1ymgHDB%2Fqo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0TAQH%2FBAUwAwEB%2FzAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZIzj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70%2FaTSVaYgLXTWNLxBo1BfASdWtL4ndQavEi51mI38AjEAi%2FV3bNTIZargCyzuFJ0nN6T5U6VR5CmD1%2FiQMVtCnwr1%2Fq4AaOeMSQ%2B2b1tbFfLn";
const multipleSelfSignedCertsWithoutCommonNameAndSAN =
  "about:certificate?cert=MIIDMzCCAhugAwIBAgIUNSk%2FychSLML28f8Qb2mPZylVhlowDQYJKoZIhvcNAQELBQAwKTELMAkGA1UEBhMCVVMxGjAYBgNVBAoMEVRlc3QgT3JnYW5pemF0aW9uMB4XDTI1MTAwNzIzNDg0OVoXDTI2MTAwNzIzNDg0OVowKTELMAkGA1UEBhMCVVMxGjAYBgNVBAoMEVRlc3QgT3JnYW5pemF0aW9uMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuDsd3NPEmNciDoKRFEH4SzDxKoPHOdDp76ORTO%2BDzMAsGnL%2FO9xTb26GNtwmTD6H5dKUEx06ob6lMWOjpn1WbyG0alxsJFQdWI0Dn13c7qO%2BDIBJXp3%2Bz3KjGXqmjfaihK354m4EDNIrhrfnUlcNZRHRS75ArFjNMs9EWmZa7p3xbYxy%2F1ueUNio%2Brrvqt4P8yghiXAQAwMG5Xp66zI0MG5UkgrMRTm9SeUH4fU0uiKo8xkTWFfKksmjKH%2BqQMVz9Xv7OkQxu7IdqLVwIEmzrk845XL3FzNHBjzkE0x45Xt%2FBY1fCjvvqXhB8oL1WWuvbco%2BKGSDTWo%2FC5zwmT3I9wIDAQABo1MwUTAdBgNVHQ4EFgQULsHvm3bdb4SepVHRjzJg1T0JxtswHwYDVR0jBBgwFoAULsHvm3bdb4SepVHRjzJg1T0JxtswDwYDVR0TAQH%2FBAUwAwEB%2FzANBgkqhkiG9w0BAQsFAAOCAQEAMF6C7Ka86mFEIiOZ5BZpMCqmjQ0bp4cz4y%2BG6HY9sjINvBwCKFBmgd95nKXGjWU2VE7hCkqsIA69%2FGPLZN9XT1d9cGswwbSnuzNBHLsRj0INUoQIL%2BJUxIUNidgA5YhSBT9trfgLiZOSy7SegAq84Q33jXMnjpy1ElBEweIpOcKH%2FZ2xPe76txVBXv8Ch%2BvuzCbs%2FeF7EaHPutcoU4ZjVULiG10H%2F%2BRnENbGvs4P4OipPkGTtk1wQVBqd%2Fw2cWKdo%2FxnuN4NUxPMgfBiGzTBrEtqFVwgkcaZ8vhXPXvjsseB26e3v1riZ5N%2B5pfbV%2Bc8u2jW9I21mHY%2FV8c4gfNoow%3D%3D&cert=MIIEHTCCAoWgAwIBAgIUL%2BnL3QzdkLY7nytwXccNijFOy8MwDQYJKoZIhvcNAQEMBQAwHjELMAkGA1UEBhMCR0IxDzANBgNVBAcMBkxvbmRvbjAeFw0yNTEwMDcyMzQ4MjFaFw0yNjEwMDcyMzQ4MjFaMB4xCzAJBgNVBAYTAkdCMQ8wDQYDVQQHDAZMb25kb24wggGiMA0GCSqGSIb3DQEBAQUAA4IBjwAwggGKAoIBgQCQVNfSxiCWYNVPIVjdhKA9J%2BUNugM7R97bcBc1IDS6lGtWZlUruIcAm%2BRUpJZOwVlg7aVunRYHhNLoxQjWY5AtD6N7jBZBmohjDDRGleu4qV0AkVi7K7liUDvjMbEMkUNrxfC17DqE1%2BpcaPf4Ftv1mL1ljC71vlZuOrsFnXYTjOwVFVQlmOEr5vb8zGHiIhsTluxvmVDTvWK2nN0dbYldI8FO%2BWauTLSYvyQd5mhZk0v05zr%2FZSlmqFkzQ72BjrF9h4pa2npPcGkWirX7yDfe0zyC2LnnsuBcxEkG%2FQ%2F95IM5qG3yxmqESzE%2Fv75d5Fef8JH7tBP%2BBjsi6YzSnRsuJUUOG%2FkpBk%2FfoKppGsMA2KRdQ1gAzqfj1xXH3TB61qmpVeZVqRN375FdK6C3LhUAAOPGdtbxTR9YbvDesfca3hyD6IXLqbiYtzdoSzOEW7zZf%2FBJmjVxsjWQpeaxQjETsdAqy7ERJj66%2B77iT7nHRg%2BtsFX9U%2BGtapwW7fjdE9cCAwEAAaNTMFEwHQYDVR0OBBYEFLdUIUCD70YoioWKerMTloEx2HABMB8GA1UdIwQYMBaAFLdUIUCD70YoioWKerMTloEx2HABMA8GA1UdEwEB%2FwQFMAMBAf8wDQYJKoZIhvcNAQEMBQADggGBABXg8Fdiwhmmx1AAx%2BHkYdhug9lwKN%2BF9%2B1eun78j3r5La%2FUiGNn9TOF9NGTLVWkN34vENtNFK7qkG916n%2BR5bg59U%2FTU1NMhRJTuUvKFpYJTrnb42qxhaHC6aKQj3oe2jWao1BbZtQhQZ5tt6Nzplt%2F0DMT2lkyG0vjzvU5h%2BXhSghb23J5%2Fqu6zLEAv9jWn2GHD6exCvlg%2BjTEugTi8PNWLi0siydxZSCsfguSiG%2F71wH4rKwMejhZ53on9YB64GKUUgssRSQGbvVnYtmuPNUGZZXirGQWdE%2F%2FxtHunTU%2FqnQIEdHnAXW%2B%2FFiA2ihuHxTJ62vn4kOsYF7817mvREnqamBeK16LbLyOVwtPqVMvIaZbJ9a92ffLIoBLPEAiiEIf7%2FfCpJR25cwiNwiT5aex%2FILoQxRAlY%2BmsXVGn8giUQICeJPE8gQ0hMF5Xh4eU1AIVvdPDmZfTnAzOKslk0r3woLyNIlaLmKfHuQpetEIJgiR1n0NlJCeLN8rETrSYg%3D%3D";

// both invalids
const errorCerts1 = "about:certificate?cert=aa&cert=bb&cert=abc";
// one invalid and other valid
const errorCerts2 =
  "about:certificate?cert=aa&cert=MIIGRjCCBS6gAwIBAgIQDJduPkI49CDWPd%2BG7%2Bu6kDANBgkqhkiG9w0BAQsFADBNMQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMScwJQYDVQQDEx5EaWdpQ2VydCBTSEEyIFNlY3VyZSBTZXJ2ZXIgQ0EwHhcNMTgxMTA1MDAwMDAwWhcNMTkxMTEzMTIwMDAwWjCBgzELMAkGA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcTDU1vdW50YWluIFZpZXcxHDAaBgNVBAoTE01vemlsbGEgQ29ycG9yYXRpb24xDzANBgNVBAsTBldlYk9wczEYMBYGA1UEAxMPd3d3Lm1vemlsbGEub3JnMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuKruymkkmkqCJh7QjmXlUOBcLFRyw5LG%2FvUUWVrsxC2gsbR8WJq%2BcYoYBpoNVStKrO4U2rBh1GEbccvT6qKOQI%2BpjjDxx9cmRdubGTGp8L0MF1ohVvhIvYLumOEoRDDPU4PvGJjGhek%2FojvedPWe8dhciHkxOC2qPFZvVFMwg1%2Fo%2Fb80147BwZQmzB18mnHsmcyKlpsCN8pxw86uao9Iun8gZQrsllW64rTZlRR56pHdAcuGAoZjYZxwS9Z%2BlvrSjEgrddemWyGGalqyFp1rXlVM1Tf4%2FIYWAQXTgTUN303u3xMjss7QK7eUDsACRxiWPLW9XQDd1c%2ByvaYJKzgJ2wIDAQABo4IC6TCCAuUwHwYDVR0jBBgwFoAUD4BhHIIxYdUvKOeNRji0LOHG2eIwHQYDVR0OBBYEFNpSvSGcN2VT%2FB9TdQ8eXwebo60%2FMCcGA1UdEQQgMB6CD3d3dy5tb3ppbGxhLm9yZ4ILbW96aWxsYS5vcmcwDgYDVR0PAQH%2FBAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjBrBgNVHR8EZDBiMC%2BgLaArhilodHRwOi8vY3JsMy5kaWdpY2VydC5jb20vc3NjYS1zaGEyLWc2LmNybDAvoC2gK4YpaHR0cDovL2NybDQuZGlnaWNlcnQuY29tL3NzY2Etc2hhMi1nNi5jcmwwTAYDVR0gBEUwQzA3BglghkgBhv1sAQEwKjAoBggrBgEFBQcCARYcaHR0cHM6Ly93d3cuZGlnaWNlcnQuY29tL0NQUzAIBgZngQwBAgIwfAYIKwYBBQUHAQEEcDBuMCQGCCsGAQUFBzABhhhodHRwOi8vb2NzcC5kaWdpY2VydC5jb20wRgYIKwYBBQUHMAKGOmh0dHA6Ly9jYWNlcnRzLmRpZ2ljZXJ0LmNvbS9EaWdpQ2VydFNIQTJTZWN1cmVTZXJ2ZXJDQS5jcnQwDAYDVR0TAQH%2FBAIwADCCAQIGCisGAQQB1nkCBAIEgfMEgfAA7gB1AKS5CZC0GFgUh7sTosxncAo8NZgE%2BRvfuON3zQ7IDdwQAAABZuYWiHwAAAQDAEYwRAIgZnMSH1JdG6NASHWTwD0mlP%2Fzbr0hzP263c02Ym0DU64CIEe4QHJDP47j0b6oTFu6RrZz1NQ9cq8Az1KnMKRuaFAlAHUAh3W%2F51l8%2BIxDmV%2B9827%2FVo1HVjb%2FSrVgwbTq%2F16ggw8AAAFm5haJAgAABAMARjBEAiAxGLXkUaOAkZhXNeNR3pWyahZeKmSaMXadgu18SfK1ZAIgKtwu5eGxK76rgaszLCZ9edBIjuU0DKorzPUuxUXFY0QwDQYJKoZIhvcNAQELBQADggEBAKLJAFO3wuaP5MM%2Fed1lhk5Uc2aDokhcM7XyvdhEKSHbgPhcgMoT9YIVoPa70gNC6KHcwoXu0g8wt7X6Vm1ql%2F68G5q844kFuC6JPl4LVT9mciD%2BVW6bHUSXD9xifL9DqdJ0Ic0SllTlM%2Boq5aAeOxUQGXhXIqj6fSQv9fQN6mXxQIoc%2Fgjxteskq%2FVl8YmY1FIZP9Bh7g27kxZ9GAAGQtjTL03RzKAuSg6yeImYVdQWasc7UPnBXlRAzZ8%2BOJThUbzK16a2CI3Rg4agKSJk%2BuA47h1%2FImmngpFLRb%2FMvRX6H1oWcUuyH6O7PZdl0YpwTpw1THIuqCGl%2FwpPgyQgcTM%3D";

async function checkSubjectName(inputPage, subjectsNameInfo) {
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: inputPage,
    },
    async function (browser) {
      await SpecialPowers.spawn(
        browser,
        [subjectsNameInfo],
        async function (subjectsNameInfoExpected) {
          let certificateSection = await ContentTaskUtils.waitForCondition(
            () => {
              return content.document.querySelector("certificate-section");
            },
            "Certificate section found"
          );

          async function selectTab(tabName, index) {
            let tabs =
              certificateSection.shadowRoot.querySelector(".certificate-tabs");

            let tab = tabs.querySelector(`.tab[idnumber="${index}"]`);
            Assert.ok(tab, `Tab at index ${index} found`);
            Assert.equal(
              tab.innerText,
              tabName,
              `Tab name should be ${tabName}`
            );

            tab.click();
          }

          function checkSelectedTab(
            sectionItemsExpected,
            sectionTitleExpected,
            index
          ) {
            let infoGroup = certificateSection.shadowRoot.querySelector(
              `#panel${index} info-group`
            );
            Assert.ok(infoGroup, "infoGroup found");

            let sectionTitle =
              infoGroup.shadowRoot.querySelector(".info-group-title").innerText;
            Assert.equal(
              sectionTitle,
              sectionTitleExpected,
              "Subject Name must be the selected item"
            );

            let infoItems = infoGroup.shadowRoot.querySelectorAll("info-item");
            Assert.equal(
              infoItems.length,
              sectionItemsExpected.length,
              "sectionItems must be the same length"
            );

            let sectionItemsDictExpected = Object.fromEntries(
              sectionItemsExpected.map(item => [item.label, item.info])
            );

            for (let i = 0; i < infoItems.length; i++) {
              let infoItem = infoItems[i];
              let infoLabelText =
                infoItem.shadowRoot.querySelector("label").innerText;
              let infoValueText =
                infoItem.shadowRoot.querySelector(".info").innerText;
              Assert.equal(
                infoValueText,
                sectionItemsDictExpected[infoLabelText],
                `Section item ${infoLabelText} must have correct value.`
              );
            }
          }

          for (let i = 0; i < subjectsNameInfoExpected.length; i++) {
            await selectTab(subjectsNameInfoExpected[i].tabName, i);
            checkSelectedTab(
              subjectsNameInfoExpected[i].sectionItems,
              subjectsNameInfoExpected[i].sectionTitle,
              i
            );
          }
        }
      );
    }
  );
}

async function checkTabsName(inputPage, pageTitle, tabsNames) {
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: inputPage,
    },
    async function (browser) {
      await SpecialPowers.spawn(
        browser,
        [pageTitle, tabsNames],
        async function (expectedPageTitle, expectedTabsNames) {
          let certificateSection = await ContentTaskUtils.waitForCondition(
            () => {
              return content.document.querySelector("certificate-section");
            },
            "Certificate section found"
          );

          let certPageTitle = await ContentTaskUtils.waitForCondition(() => {
            return content.document.querySelector("#certTitle");
          }, "Page title found");
          Assert.equal(
            certPageTitle.innerText,
            expectedPageTitle,
            `Page title should be ${expectedPageTitle}`
          );

          let tabsSection =
            certificateSection.shadowRoot.querySelector(".certificate-tabs");
          Assert.ok(tabsSection, "Tabs section found");

          let tabs = tabsSection.children;
          Assert.equal(
            tabs.length,
            expectedTabsNames.length,
            `There must be ${expectedTabsNames.length} tabs`
          );

          for (let i = 0; i < expectedTabsNames.length; i++) {
            Assert.equal(
              tabs[i].innerText,
              expectedTabsNames[i],
              "Tab name must be equal to expected tab name"
            );
            if (i === 0) {
              Assert.ok(
                tabs[i].className.includes("selected"),
                "First tab must be selected"
              );
            } else {
              Assert.equal(
                tabs[i].className.includes("selected"),
                false,
                "Just the first tab must be selected"
              );
            }
          }
        }
      );
    }
  );
}

async function checkDOM(inputPage, errorExpected) {
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: inputPage,
    },
    async function (browser) {
      await SpecialPowers.spawn(
        browser,
        [errorExpected],
        async function (errorExpected) {
          let certificateSection = await ContentTaskUtils.waitForCondition(
            () => {
              return content.document.querySelector("certificate-section");
            },
            "Certificate section found"
          );

          let errorSection =
            certificateSection.shadowRoot.querySelector("error-section");

          if (errorExpected) {
            // should render error page
            Assert.ok(errorSection, "Error section found");
          } else {
            // should render page with certificate info
            Assert.equal(errorSection, null, "Error section was not found");
          }
        }
      );
    }
  );
}

add_task(async function runTests() {
  let inputs = [
    {
      url: multipleCerts1,
      pageTitle: "Certificate for www.mozilla.org",
      tabsNames: ["www.mozilla.org", "github.com"],
      errorPageExpected: false,
      subjectNameInfo: [
        {
          tabName: "www.mozilla.org",
          sectionTitle: "Subject Name",
          sectionItems: [
            { label: "Country", info: "US" },
            { label: "State/Province", info: "California" },
            { label: "Locality", info: "Mountain View" },
            { label: "Organization", info: "Mozilla Corporation" },
            { label: "Organizational Unit", info: "WebOps" },
            { label: "Common Name", info: "www.mozilla.org" },
          ],
        },
        {
          tabName: "github.com",
          sectionTitle: "Subject Name",
          sectionItems: [
            { label: "Business Category", info: "Private Organization" },
            { label: "Inc. Country", info: "US" },
            { label: "Inc. State/Province", info: "Delaware" },
            { label: "Serial Number", info: "5157550" },
            { label: "Country", info: "US" },
            { label: "State/Province", info: "California" },
            { label: "Locality", info: "San Francisco" },
            { label: "Organization", info: "GitHub, Inc." },
            { label: "Common Name", info: "github.com" },
          ],
        },
      ],
    },
    {
      url: multipleCerts2,
      pageTitle: "Certificate for *.google.com",
      tabsNames: ["*.google.com", "*.twitter.com"],
      errorPageExpected: false,
      subjectNameInfo: [
        {
          tabName: "*.google.com",
          sectionTitle: "Subject Name",
          sectionItems: [
            { label: "Country", info: "US" },
            { label: "State/Province", info: "California" },
            { label: "Locality", info: "Mountain View" },
            { label: "Organization", info: "Google LLC" },
            { label: "Common Name", info: "*.google.com" },
          ],
        },
        {
          tabName: "*.twitter.com",
          sectionTitle: "Subject Name",
          sectionItems: [
            { label: "Country", info: "US" },
            { label: "State/Province", info: "California" },
            { label: "Locality", info: "San Francisco" },
            { label: "Organization", info: "Twitter, Inc." },
            { label: "Organizational Unit", info: "atla" },
            { label: "Common Name", info: "*.twitter.com" },
          ],
        },
      ],
    },
    {
      url: multipleCertsWithoutCommonName,
      pageTitle: "Certificate for ezdrp-forms.ezdrp.ezd-02.cloud.cui.pg.gda.pl",
      tabsNames: [
        "ezdrp-forms.ezdrp.ezd-02.cloud.cui.pg.gda.pl",
        "E5",
        "ISRG Root X2",
      ],
      errorPageExpected: false,
      subjectNameInfo: [
        {
          tabName: "ezdrp-forms.ezdrp.ezd-02.cloud.cui.pg.gda.pl",
          sectionTitle: "Issuer Name",
          sectionItems: [
            { label: "Country", info: "US" },
            { label: "Organization", info: "Let's Encrypt" },
            { label: "Common Name", info: "E5" },
          ],
        },
        {
          tabName: "E5",
          sectionTitle: "Subject Name",
          sectionItems: [
            { label: "Country", info: "US" },
            { label: "Organization", info: "Let's Encrypt" },
            { label: "Common Name", info: "E5" },
          ],
        },
        {
          tabName: "ISRG Root X2",
          sectionTitle: "Subject Name",
          sectionItems: [
            { label: "Country", info: "US" },
            { label: "Organization", info: "Internet Security Research Group" },
            { label: "Common Name", info: "ISRG Root X2" },
          ],
        },
      ],
    },
    {
      url: multipleSelfSignedCertsWithoutCommonNameAndSAN,
      pageTitle: "Certificate for Test Organization",
      tabsNames: ["Test Organization", "London"],
      errorPageExpected: false,
      subjectNameInfo: [
        {
          tabName: "Test Organization",
          sectionTitle: "Subject Name",
          sectionItems: [
            { label: "Country", info: "US" },
            { label: "Organization", info: "Test Organization" },
          ],
        },
        {
          tabName: "London",
          sectionTitle: "Subject Name",
          sectionItems: [
            { label: "Country", info: "GB" },
            { label: "Locality", info: "London" },
          ],
        },
      ],
    },
    {
      url: errorCerts1,
      tabsNames: [],
      errorPageExpected: true,
    },
    {
      url: errorCerts2,
      tabsNames: [],
      errorPageExpected: true,
    },
  ];

  for (let input of inputs) {
    await checkDOM(input.url, input.errorPageExpected);
    if (!input.errorPageExpected) {
      await checkTabsName(input.url, input.pageTitle, input.tabsNames);
      await checkSubjectName(input.url, input.subjectNameInfo);
    }
  }
});
