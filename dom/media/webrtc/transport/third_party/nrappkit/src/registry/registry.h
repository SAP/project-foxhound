/*
 *
 *    registry.h
 *
 *    $Source: /Users/ekr/tmp/nrappkit-dump/nrappkit/src/registry/registry.h,v $
 *    $Revision: 1.3 $
 *    $Date: 2007/07/17 17:58:16 $
 *
 *    Datastore for tracking configuration and related info.
 *
 *
 *    Copyright (C) 2005, Network Resonance, Inc.
 *    Copyright (C) 2006, Network Resonance, Inc.
 *    All Rights Reserved
 *
 *    Redistribution and use in source and binary forms, with or without
 *    modification, are permitted provided that the following conditions
 *    are met:
 *
 *    1. Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *    2. Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *    3. Neither the name of Network Resonance, Inc. nor the name of any
 *       contributors to this software may be used to endorse or promote
 *       products derived from this software without specific prior written
 *       permission.
 *
 *    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS ``AS IS''
 *    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 *    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 *    ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 *    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 *    CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 *    SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 *    INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 *    CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *    ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *    POSSIBILITY OF SUCH DAMAGE.
 *
 *
 */

#ifndef __REGISTRY_H__
#define __REGISTRY_H__

#include <stdio.h>
#include <sys/types.h>
#include <r_types.h>
#include <r_data.h>

#define NR_REG_MAX_NR_REGISTRY_LEN     128
#define NR_REG_MAX_TYPE_LEN            32

typedef char NR_registry[NR_REG_MAX_NR_REGISTRY_LEN];
typedef char NR_registry_type[NR_REG_MAX_TYPE_LEN];
typedef const char * NR_registry_name;

extern NR_registry_name NR_TOP_LEVEL_REGISTRY;

int NR_reg_init(void);

int NR_reg_initted(void);

int NR_reg_get_char(NR_registry_name name, char *out);
int NR_reg_get_uchar(NR_registry_name name, UCHAR *out);
int NR_reg_get_uint2(NR_registry_name name, UINT2 *out);
int NR_reg_get_int4(NR_registry_name name, INT4 *out);
int NR_reg_get_uint4(NR_registry_name name, UINT4 *out);
int NR_reg_get_uint8(NR_registry_name name, UINT8 *out);
int NR_reg_get_double(NR_registry_name name, double *out);
int NR_reg_get_registry(NR_registry_name name, NR_registry out);

int NR_reg_get_bytes(NR_registry_name name, UCHAR *out, size_t size, size_t *length);
int NR_reg_get_string(NR_registry_name name, char *out, size_t size);
int NR_reg_get_length(NR_registry_name name, size_t *length);


int NR_reg_get2_char(NR_registry_name prefix, const char *name, char *);
int NR_reg_get2_uchar(NR_registry_name prefix, const char *name, UCHAR *);
int NR_reg_get2_uint2(NR_registry_name prefix, const char *name, UINT2 *);

int NR_reg_alloc2_string(NR_registry_name prefix, const char *name, char **);
int NR_reg_alloc2_data(NR_registry_name prefix, const char *name, Data *);

int NR_reg_set_char(NR_registry_name name, char data);
int NR_reg_set_uchar(NR_registry_name name, UCHAR data);
int NR_reg_set_int4(NR_registry_name name, INT4 data);
int NR_reg_set_uint4(NR_registry_name name, UINT4 data);

int NR_reg_set_registry(NR_registry_name name);

int NR_reg_set_bytes(NR_registry_name name, const UCHAR *data, size_t length);
int NR_reg_set_string(NR_registry_name name, const char *data);

int NR_reg_set2_uchar(NR_registry_name prefix, const char *name, UCHAR data);

int NR_reg_set2_string(NR_registry_name prefix, const char *name, const char *data);

int NR_reg_del(NR_registry_name name);

int NR_reg_get_child_count(NR_registry_name parent, unsigned int *count);
int NR_reg_get_child_registry(NR_registry_name parent, unsigned int i, NR_registry child);

/* convenience methods, call RFREE on the returned data */
int NR_reg_alloc_data(NR_registry_name name, Data *data);
int NR_reg_alloc_string(NR_registry_name name, char **data);

#define NR_REG_CB_ACTION_ADD      (1<<0)
#define NR_REG_CB_ACTION_CHANGE   (1<<1)
#define NR_REG_CB_ACTION_DELETE   (1<<2)
#define NR_REG_CB_ACTION_FINAL    (1<<6)
int NR_reg_register_callback(NR_registry_name name, char action, void (*cb)(void *cb_arg, char action, NR_registry_name name), void *cb_arg);

int NR_reg_make_registry(NR_registry_name parent, const char *child, NR_registry out);

#endif
