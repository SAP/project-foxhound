import subprocess
import sys
from junit_xml import TestSuite, TestCase

run_tests = True
dump_test_output = False

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


# Execute Jstests

if run_tests:
    result = subprocess.run(["./mach", "jstests", "--tinderbox"], capture_output=True)

    data = result.stdout.decode("utf-8")

    if dump_test_output:
        with open("dump.txt", "w+") as f:
            f.write(data)
else:
    data = open("dump.txt").read()

tests = parse_report(data)

with open("jstest_output.xml", "w") as f:
    TestSuite.to_file(f, [tests])

sys.exit(result.returncode)
