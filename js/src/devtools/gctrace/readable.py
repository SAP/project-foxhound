#!/usr/bin/env python
import struct
import sys

eventtypes = {
	0: "Init",
	#1: "ThingSize",
	2: "NurseAlloc",
	3: "TenAlloc",
	#7: "CreateObj",
	8: "MinGCStart",
	9: "PromTenure",
	10: "MinGCEnd",
	11: "MajGCStart",
	12: "TenFinal",
	13: "MajGCEnd"
}

alloced = []

f = open(sys.argv[1])
while True:
    chunk = f.read(8)
    if chunk == '':
        break
    event = struct.unpack("Q", chunk)[0]
    eventid = event >> 56
    extra = (event >> 48) & ((1 << 8) - 1)
    payload = event & ((1 << 48) - 1)
    if eventid in eventtypes.keys() or (eventid == 12 and payload in alloced):
    	print "% 10s | %3d | %x" % (eventtypes.get(eventid), extra, payload)

    if eventid == 2:
    	alloced.append(payload)

f.close()