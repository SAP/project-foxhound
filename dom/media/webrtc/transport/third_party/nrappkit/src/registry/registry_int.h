/*
 *
 *    registry_int.h
 *
 *    $Source: /Users/ekr/tmp/nrappkit-dump/nrappkit/src/registry/registry_int.h,v $
 *    $Revision: 1.3 $
 *    $Date: 2007/06/26 22:37:51 $
 *
 *    Callback-related functions
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

#ifndef __REGISTRY_INT_H__
#define __REGISTRY_INT_H__

#include <sys/types.h>
#include <r_types.h>
#ifndef NO_REG_RPC
#include <rpc/rpc.h>
#endif

extern int NR_LOG_REGISTRY;

int nr_reg_is_valid(NR_registry_name name);

#define NR_REG_TYPE_CHAR               0
#define NR_REG_TYPE_UCHAR              1
#define NR_REG_TYPE_INT2               2
#define NR_REG_TYPE_UINT2              3
#define NR_REG_TYPE_INT4               4
#define NR_REG_TYPE_UINT4              5
#define NR_REG_TYPE_INT8               6
#define NR_REG_TYPE_UINT8              7
#define NR_REG_TYPE_DOUBLE             8
#define NR_REG_TYPE_BYTES              9
#define NR_REG_TYPE_STRING             10
#define NR_REG_TYPE_REGISTRY           11
const char *nr_reg_type_name(int type);
const char *nr_reg_action_name(int action);

int nr_reg_cb_init(void);
int nr_reg_client_cb_init(void);
int nr_reg_register_for_callbacks(int fd, int connect_to_port);
int nr_reg_raise_event(NR_registry_name name, int action);
#ifndef NO_REG_RPC
int nr_reg_get_client(CLIENT **client);
#endif

#define CALLBACK_SERVER_ADDR     "127.0.0.1"
#define CALLBACK_SERVER_PORT     8082
#define CALLBACK_SERVER_BACKLOG  32

/* if C were an object-oriented language, nr_scalar_registry_node and
 * nr_array_registry_node would subclass nr_registry_node, but it isn't
 * object-oriented language, so this is used in cases where the pointer
 * could be of either type */
typedef struct nr_registry_node_ {
    unsigned char  type;
} nr_registry_node;

typedef struct nr_scalar_registry_node_ {
    unsigned char  type;
    union {
        char          _char;
        UCHAR         _uchar;
        INT2       _nr_int2;
        UINT2      _nr_uint2;
        INT4       _nr_int4;
        UINT4      _nr_uint4;
        INT8       _nr_int8;
        UINT8      _nr_uint8;
        double        _double;
    } scalar;
} nr_scalar_registry_node;

/* string, bytes */
typedef struct nr_array_registry_node_ {
    unsigned char    type;
    struct {
        unsigned int     length;
        unsigned char    data[1];
    } array;
} nr_array_registry_node;

typedef struct nr_reg_find_children_arg_ {
    size_t         size;
    NR_registry   *children;
    size_t         length;
} nr_reg_find_children_arg;

int nr_reg_local_init(void);

int nr_reg_get(const char *name, int type, void *out);
int nr_reg_get_array(const char *name, unsigned char type, UCHAR *out, size_t size, size_t *length);

int nr_reg_set(const char *name, int type, void *data);
int nr_reg_set_array(const char *name, unsigned char type, const UCHAR *data, size_t length);

int nr_reg_fetch_node(const char *name, unsigned char type, nr_registry_node **node, int *free_node);

int nr_reg_local_get_length(NR_registry_name name, size_t *len);
int nr_reg_local_del(NR_registry_name name);
int nr_reg_local_get_child_count(NR_registry_name parent, size_t *count);
int nr_reg_local_get_children(NR_registry_name parent, NR_registry *data, size_t size, size_t *length);

#endif
