#! /usr/bin/env python3

from pysnmp.hlapi import *

import sys
import json

DEF_PORT    = 161
DEF_IFS_ID  = '.1.3.6.1.2.1.2.2.1.1'
DEF_IFS_NAM = '.1.3.6.1.2.1.2.2.1.2'
DEF_IFS_OP  = '.1.3.6.1.2.1.2.2.1.8'
DEF_CDP     = '.1.3.6.1.4.1.9.9.23.1.2.1.1'


def ListInterfaces(ip_addr):
    ifs = []
    # list available interfaces via ifIndex
    for (errIndic, errStat, errIndx, binds) in bulkCmd(
            SnmpEngine(), CommunityData('public'),
            UdpTransportTarget((ip_addr, DEF_PORT)),
            ContextData(), 1, 100,
            ObjectType(ObjectIdentity(DEF_IFS_ID)),
            lexicographicMode=False):
        if errIndic:
            print(errorIndic)
        elif errStat:
            print('%s at %s' % (errStat.prettyPrint(), 
                errIndx and binds[int(errIndx) - 1][0] or '?'))
        else:
            try:
                ifs.append(int(binds[0][1]))
            except:
                pass
    # check oper status for available interfaces
    if_avail = {}
    for ifid in ifs:
        cval = GetSnmpValue(ip_addr, DEF_IFS_OP + '.' + str(ifid))
        try:
            if (cval is not None) and (int(cval) == 1):
                if_avail[ifid] = None
        except:
            pass
    for ifid in if_avail.keys():
        cval = GetSnmpValue(ip_addr, DEF_IFS_NAM + '.' + str(ifid))
        try:
            if cval is not None:
                if_avail[ifid] = str(cval)
        except:
            pass
    return if_avail

def GetCDP(ip_addr, if_avail):
    for (errIndic, errStat, errIndx, binds) in nextCmd(
            SnmpEngine(), CommunityData('public'),
            UdpTransportTarget((ip_addr, DEF_PORT)),
            ContextData(),
            ObjectType(ObjectIdentity(DEF_CDP))):
        if errIndic:
            print(errorIndic)
        elif errStat:
            print('%s at %s' % (errStat.prettyPrint(), 
                errIndx and binds[int(errIndx) - 1][0] or '?'))
        else:
            for item in binds:
                print(' = '.join([x.prettyPrint() for x in item]))

def GetSnmpValue(ip_addr, oid):
    for (errIndic, errStat, errIndx, binds) in getCmd(
        SnmpEngine(), CommunityData('public'),
        UdpTransportTarget((ip_addr, DEF_PORT)),
        ContextData(),
        ObjectType(ObjectIdentity(oid))):
        if errIndic:
            return None
        elif errStat:
            return None
        else:
            return binds[0][1]

if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise Exception("<script> <target IP address>")
    if_avail = ListInterfaces(sys.argv[1])
    print(json.dumps(if_avail))

