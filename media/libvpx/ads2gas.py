import sys
import subprocess

import buildconfig

def generate(output, script, assembly_input):
    with open(assembly_input, "rb") as fd:
        content = subprocess.check_output([buildconfig.substs["PERL"], script], input=fd.read())
        output.write(content)

