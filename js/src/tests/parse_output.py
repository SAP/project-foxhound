import subprocess
import sys
from junit_xml import TestSuite, TestCase

run_tests = True
failure_message = ""

def parse_report(report):
    res = []
    for line in report.splitlines():
        parsed = parse_line(line)
        if parsed:
            res.append(parsed)
    return TestSuite("Jstests", res)

def parse_line(line):
    global failure_message

    parts = line.split(" | ")
    test_status = parts[0]

    if test_status not in ["TEST-PASS", "TEST-KNOWN-FAIL", "TEST-UNEXPECTED-FAIL"]:
        # Line is part of an failure message
        failure_message += line + "\n"
        return None

    time = float(line.split(("["))[1].split(" s")[0])
    test_case = TestCase(parts[1], elapsed_sec=time)
    if test_status == "TEST-UNEXPECTED-FAIL":
        test_case.add_failure_info(output=failure_message)
        failure_message = ""

    if test_status == "TEST-KNOWN-FAIL":
        test_case.add_skipped_info()
    return test_case

def write_markdown(cmd, f, tests):
    failed_tests = []
    ntests = 0
    nfails = 0
    nskips = 0
    for case in tests.test_cases:
        if case.is_error():
            failed_tests.append(case)
            nfails += 1
        elif case.is_skipped():
            nskips += 1
        ntests += 1

    f.write(f"""# :rocket: Test Report
Summary of JavaScript tests run with command:
```bash
{cmd}
```
## Summary
  - {ntests} Total
  - {nskips} Skipped
  - {nfails} Failed

## Failed Tests
""")

    if len(failed_tests) > 0:
        for failed in failed_tests:
            f.write(f"  - {failed.name}")
    else:
        f.write("No failed tests")

# Execute Jstests
result = None
outfile = "jstest_dump.txt"
errfile = "jstest_stderr.txt"
cmd = ["./mach", "jstests", "--tinderbox"]

if run_tests:
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True)
    print("Done!")

    print(f"Writing stdout to {outfile}") 
    data = result.stdout.decode("utf-8")
    with open(outfile, "w+") as f:
        f.write(data)

    print(f"Writing stdout to {errfile}") 
    errdata = result.stderr.decode("utf-8")
    with open(errfile, "w+") as f:
        f.write(errdata)
else:
    print(f"Reading results from {outfile}") 
    data = open(outfile).read()

print("Writing JUnit output file")
tests = parse_report(data)
with open("jstest_output.xml", "w") as f:
    TestSuite.to_file(f, [tests])

print("Writing Markdown Output")
with open("jstest_output.md", "w") as f:
    write_markdown(' '.join(cmd), f, tests)

print("All done!")