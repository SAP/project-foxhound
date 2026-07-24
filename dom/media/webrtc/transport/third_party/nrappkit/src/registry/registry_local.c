/*
 *
 *    registry.c
 *
 *    $Source: /Users/ekr/tmp/nrappkit-dump/nrappkit/src/registry/registry_local.c,v $
 *    $Revision: 1.4 $
 *    $Date: 2007/11/21 00:09:13 $
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

#include <assert.h>
#include <string.h>
#ifndef WIN32
#include <strings.h>
#include <sys/param.h>
#include <netinet/in.h>
#endif
#ifdef OPENSSL
#include <openssl/ssl.h>
#endif
#include <ctype.h>
#include <stdlib.h>
#include <csi_platform.h>
#include "registry.h"
#include "registry_int.h"
#include "r_assoc.h"
#include "r_log.h"
#include "r_errors.h"
#include "r_macros.h"

static int nr_reg_local_compare_string(const void *arg1, const void *arg2) {
   return strcasecmp(*(const char **)arg1, *(const char **)arg2);
}

static int nr_reg_insert_node(const char *name, void *node);
static int nr_reg_change_node(const char *name, void *node, void *old);
static int nr_reg_get_data(NR_registry_name name, nr_scalar_registry_node *node, void *out);
static int nr_reg_set_parent_registries(const char *name);
char *nr_reg_alloc_node_data(const char *name, nr_registry_node *node, int *freeit);
static int nr_reg_rfree(void *ptr);
static int nr_reg_compute_length(const char *name, nr_registry_node *node, size_t *length);
const char *nr_reg_action_name(int action);

/* the registry, containing mappings like "foo.bar.baz" to registry
 * nodes, which are either of type nr_scalar_registry_node or
 * nr_array_registry_node */
static r_assoc     *nr_registry = 0;

static int nr_reg_local_iter(NR_registry_name prefix, int (*action)(void *ptr, r_assoc_iterator *iter, const char *prefix, const char *name, nr_registry_node *node), void *ptr);
static int nr_reg_local_iter_delete(void *ptr, r_assoc_iterator *iter, const char *prefix, const char *name, nr_registry_node *node);
static int nr_reg_local_find_children(void *ptr, r_assoc_iterator *iter, const char *prefix, const char *name, nr_registry_node *node);
static int nr_reg_local_count_children(void *ptr, r_assoc_iterator *iter, const char *prefix, const char *name, nr_registry_node *node);



int
nr_reg_local_iter(NR_registry_name prefix, int (*action)(void *ptr, r_assoc_iterator *iter, const char *prefix, const char *name, nr_registry_node *node), void *ptr)
{
    int r, _status;
    r_assoc_iterator iter;
    char *name = 0;
    int namel;
    nr_registry_node *node;
    int prefixl;

    if (prefix == 0)
        ABORT(R_INTERNAL);

    if ((r=r_assoc_init_iter(nr_registry, &iter)))
        ABORT(r);

    prefixl = strlen(prefix);

    for (;;) {
      if ((r=r_assoc_iter(&iter, (void**)&name, &namel, (void**)&node))) {
        if (r == R_EOD)
          break;
        else
          ABORT(r);
      }

      /* subtract to remove the '\0' character from the string length */
      --namel;

      /* sanity check that the name is null-terminated */
      assert(namel >= 0);
      assert(name[namel] == '\0');

      if (namel < 0 || name[namel] != '\0' || node == 0)
          break;

      /* 3 cases where action will be called:
       *   1) prefix == ""
       *   2) prefix == name
       *   3) name == prefix + '.'
       */
      if (prefixl == 0
       || ((namel == prefixl || (namel > prefixl && name[prefixl] == '.'))
         && !strncmp(prefix, name, prefixl))) {
        if ((r=action(ptr, &iter, prefix, name, node)))
          ABORT(r);
      }
    }

    _status=0;
  abort:

    return(_status);
}

int
nr_reg_local_iter_delete(void *ptr, r_assoc_iterator *iter, const char *prefix, const char *name, nr_registry_node *node)
{
    int r, _status;

    if ((r=r_assoc_iter_delete(iter)))
      ABORT(r);

    _status=0;
  abort:
    return(_status);
}

int
nr_reg_local_find_children(void *ptr, r_assoc_iterator *iter, const char *prefix, const char *name, nr_registry_node *node)
{
  int _status;
  int prefixl = strlen(prefix);
  const char *dot = 0;
  nr_reg_find_children_arg *arg = (nr_reg_find_children_arg*)ptr;

  assert(sizeof(*(arg->children)) == sizeof(NR_registry));

  /* only grovel through immediate children */
  if (prefixl == 0 || name[prefixl] == '.') {
    if (name[prefixl] != '\0') {
      dot = strchr(&name[prefixl+1], '.');
      if (dot == 0) {
        strncpy(arg->children[arg->length], name, sizeof(NR_registry)-1);
        ++arg->length;

        /* only grab as many as there are room for */
        if (arg->length >= arg->size)
          ABORT(R_INTERRUPTED);
      }
    }
  }

  _status = 0;
 abort:
  return _status;
}

int
nr_reg_local_count_children(void *ptr, r_assoc_iterator *iter, const char *prefix, const char *name, nr_registry_node *node)
{
  int prefixl = strlen(prefix);
  const char *dot = 0;

  /* only count children */
  if (name[prefixl] == '.') {
    dot = strchr(&name[prefixl+1], '.');
    if (dot == 0)
      ++(*(unsigned int *)ptr);
  }
  else if (name[0] != '\0') {
    if (prefixl == 0)
      ++(*(unsigned int *)ptr);
  }

  return 0;
}


int
nr_reg_rfree(void *ptr)
{
    RFREE(ptr);
    return 0;
}

int
nr_reg_fetch_node(const char *name, unsigned char type, nr_registry_node **node, int *free_node)
{
    int r, _status;

    *node = 0;
    *free_node = 0;

    if ((r=nr_reg_is_valid(name)))
      ABORT(r);

    if ((r=r_assoc_fetch(nr_registry, name, strlen(name)+1, (void**)node)))
      ABORT(r);

    if ((*node)->type != type)
      ABORT(R_FAILED);

    _status=0;
  abort:
    if (_status) {
        if (*node)
            r_log(NR_LOG_REGISTRY, LOG_DEBUG, "Couldn't fetch node '%s' ('%s'), found '%s' instead",
              name, nr_reg_type_name(type), nr_reg_type_name((*node)->type));
        else
            r_log(NR_LOG_REGISTRY, LOG_DEBUG, "Couldn't fetch node '%s' ('%s')",
              name, nr_reg_type_name(type));
    }
    else {
        r_log(NR_LOG_REGISTRY, LOG_DEBUG, "Fetched node '%s' ('%s')",
              name, nr_reg_type_name(type));
    }
    return(_status);
}

int
nr_reg_insert_node(const char *name, void *node)
{
    int r, _status;

    if ((r=nr_reg_is_valid(name)))
      ABORT(r);

    /* since the registry application is not multi-threaded, a node being
     * inserted should always be a new node because the registry app must
     * have looked for a node with this key but not found it, so it is
     * being created/inserted now using R_ASSOC_NEW */
    if ((r=r_assoc_insert(nr_registry, name, strlen(name)+1, node, 0, nr_reg_rfree, R_ASSOC_NEW)))
      ABORT(r);

    if ((r=nr_reg_set_parent_registries(name)))
      ABORT(r);

    if ((r=nr_reg_raise_event(name, NR_REG_CB_ACTION_ADD)))
      ABORT(r);

    _status=0;
  abort:
    if (r_logging(NR_LOG_REGISTRY, LOG_INFO)) {
      int freeit;
      char *data = nr_reg_alloc_node_data(name, (nr_registry_node*)node, &freeit);
      r_log(NR_LOG_REGISTRY, LOG_INFO,
             "insert '%s' (%s) %s: %s", name,
             nr_reg_type_name(((nr_registry_node*)node)->type),
             (_status ? "FAILED" : "succeeded"), data?data:"");
      if (freeit)
        RFREE(data);
    }
    return(_status);
}

int
nr_reg_change_node(const char *name, void *node, void *old)
{
    int r, _status;

    if ((r=nr_reg_is_valid(name)))
      ABORT(r);

    if (old != node) {
        if ((r=r_assoc_insert(nr_registry, name, strlen(name)+1, node, 0, nr_reg_rfree, R_ASSOC_REPLACE)))
          ABORT(r);
    }

    if ((r=nr_reg_raise_event(name, NR_REG_CB_ACTION_CHANGE)))
      ABORT(r);

    _status=0;
  abort:
    if (r_logging(NR_LOG_REGISTRY, LOG_INFO)) {
      int freeit;
      char *data = nr_reg_alloc_node_data(name, (nr_registry_node*)node, &freeit);
      r_log(NR_LOG_REGISTRY, LOG_INFO,
             "change '%s' (%s) %s: %s", name,
             nr_reg_type_name(((nr_registry_node*)node)->type),
             (_status ? "FAILED" : "succeeded"), data?data:"");
      if (freeit)
        RFREE(data);
    }
    return(_status);
}

char *
nr_reg_alloc_node_data(const char *name, nr_registry_node *node, int *freeit)
{
    char *s = 0;
    int len;
    int alloc = 0;
    unsigned int i;

    *freeit = 0;

    switch (node->type) {
    default:
      alloc = 100;    /* plenty of room for any of the scalar types */
      break;
    case NR_REG_TYPE_REGISTRY:
      alloc = strlen(name) + 1;
      break;
    case NR_REG_TYPE_BYTES:
      alloc = (2 * ((nr_array_registry_node*)node)->array.length) + 1;
      break;
    case NR_REG_TYPE_STRING:
      alloc = 0;
      break;
    }

    if (alloc > 0) {
      s = (char*)RMALLOC(alloc);
      if (!s)
        return 0;

      *freeit = 1;
    }

    len = alloc;

    switch (node->type) {
    case NR_REG_TYPE_CHAR:
      i = ((nr_scalar_registry_node*)node)->scalar._char;
      if (isprint(i) && ! isspace(i))
          snprintf(s, len, "%c", (char)i);
      else
          snprintf(s, len, "\\%03o", (char)i);
      break;
    case NR_REG_TYPE_UCHAR:
      snprintf(s, len, "0x%02x", ((nr_scalar_registry_node*)node)->scalar._uchar);
      break;
    case NR_REG_TYPE_INT2:
      snprintf(s, len, "%d", ((nr_scalar_registry_node*)node)->scalar._nr_int2);
      break;
    case NR_REG_TYPE_UINT2:
      snprintf(s, len, "%u", ((nr_scalar_registry_node*)node)->scalar._nr_uint2);
      break;
    case NR_REG_TYPE_INT4:
      snprintf(s, len, "%d", ((nr_scalar_registry_node*)node)->scalar._nr_int4);
      break;
    case NR_REG_TYPE_UINT4:
      snprintf(s, len, "%u", ((nr_scalar_registry_node*)node)->scalar._nr_uint4);
      break;
    case NR_REG_TYPE_INT8:
      snprintf(s, len, "%lld", ((nr_scalar_registry_node*)node)->scalar._nr_int8);
      break;
    case NR_REG_TYPE_UINT8:
      snprintf(s, len, "%llu", ((nr_scalar_registry_node*)node)->scalar._nr_uint8);
      break;
    case NR_REG_TYPE_DOUBLE:
      snprintf(s, len, "%#f", ((nr_scalar_registry_node*)node)->scalar._double);
      break;
    case NR_REG_TYPE_REGISTRY:
      snprintf(s, len, "%s", name);
      break;
    case NR_REG_TYPE_BYTES:
      for (i = 0; i < ((nr_array_registry_node*)node)->array.length; ++i) {
        sprintf(&s[2*i], "%02x", ((nr_array_registry_node*)node)->array.data[i]);
      }
      break;
    case NR_REG_TYPE_STRING:
      s = (char*)((nr_array_registry_node*)node)->array.data;
      break;
    default:
      assert(0); /* bad value */
      if (freeit) {
        RFREE(s);
        *freeit = 0;
      }
      s = 0;
      break;
    }

    return s;
}

int
nr_reg_get(const char *name, int type, void *out)
{
    int r, _status;
    nr_scalar_registry_node *node = 0;
    int free_node = 0;

    if ((r=nr_reg_fetch_node(name, type, (nr_registry_node **)&node, &free_node)))
      ABORT(r);

    if ((r=nr_reg_get_data(name, node, out)))
      ABORT(r);

    _status=0;
  abort:
    if (free_node) RFREE(node);
    return(_status);
}

int
nr_reg_get_data(NR_registry_name name /* mjf-unused */, nr_scalar_registry_node *node, void *out)
{
    int _status;

    switch (node->type) {
    case NR_REG_TYPE_CHAR:
      *(char*)out = node->scalar._char;
      break;
    case NR_REG_TYPE_UCHAR:
      *(UCHAR*)out = node->scalar._uchar;
      break;
    case NR_REG_TYPE_INT2:
      *(INT2*)out = node->scalar._nr_int2;
      break;
    case NR_REG_TYPE_UINT2:
      *(UINT2*)out = node->scalar._nr_uint2;
      break;
    case NR_REG_TYPE_INT4:
      *(INT4*)out = node->scalar._nr_int4;
      break;
    case NR_REG_TYPE_UINT4:
      *(UINT4*)out = node->scalar._nr_uint4;
      break;
    case NR_REG_TYPE_INT8:
      *(INT8*)out = node->scalar._nr_int8;
      break;
    case NR_REG_TYPE_UINT8:
      *(UINT8*)out = node->scalar._nr_uint8;
      break;
    case NR_REG_TYPE_DOUBLE:
      *(double*)out = node->scalar._double;
      break;
    default:
      ABORT(R_INTERNAL);
      break;
    }

    _status=0;
  abort:
    return(_status);
}

int
nr_reg_get_array(const char *name, unsigned char type, unsigned char *out, size_t size, size_t *length)
{
    int r, _status;
    nr_array_registry_node *node = 0;
    int free_node = 0;

    if ((r=nr_reg_fetch_node(name, type, (nr_registry_node **)&node, &free_node)))
      ABORT(r);

    if (size < node->array.length)
      ABORT(R_BAD_ARGS);

    if (out != 0)
        memcpy(out, node->array.data, node->array.length);
    if (length != 0)
        *length = node->array.length;

    _status=0;
  abort:
    if (node && free_node) RFREE(node);
    return(_status);
}

int
nr_reg_set(const char *name, int type, void *data)
{
    int r, _status;
    nr_scalar_registry_node *node = 0;
    int create_node = 0;
    int changed = 0;
    int free_node = 0;

    if ((r=nr_reg_fetch_node(name, type, (nr_registry_node **)&node, &free_node)))
      if (r == R_NOT_FOUND) {
        create_node = 1;
        free_node = 1;
      }
      else
        ABORT(r);

    if (create_node) {
      if (!(node=R_NEW(nr_scalar_registry_node)))
        ABORT(R_NO_MEMORY);

      node->type = type;
    }
    else {
      if (node->type != type)
        ABORT(R_BAD_ARGS);
    }

    switch (type) {
#define CASE(TYPE, _name, type)                   \
    case TYPE:                                    \
      if (node->scalar._name != *(type*)data) {   \
        node->scalar._name = *(type*)data;        \
        if (! create_node)                        \
          changed = 1;                            \
      }                                           \
      break;
    CASE(NR_REG_TYPE_CHAR,       _char,       char)
    CASE(NR_REG_TYPE_UCHAR,      _uchar,      UCHAR)
    CASE(NR_REG_TYPE_INT2,    _nr_int2,    INT2)
    CASE(NR_REG_TYPE_UINT2,   _nr_uint2,   UINT2)
    CASE(NR_REG_TYPE_INT4,    _nr_int4,    INT4)
    CASE(NR_REG_TYPE_UINT4,   _nr_uint4,   UINT4)
    CASE(NR_REG_TYPE_INT8,    _nr_int8,    INT8)
    CASE(NR_REG_TYPE_UINT8,   _nr_uint8,   UINT8)
    CASE(NR_REG_TYPE_DOUBLE,     _double,     double)
#undef CASE

    case NR_REG_TYPE_REGISTRY:
      /* do nothing */
      break;

    default:
      ABORT(R_INTERNAL);
      break;
    }

    if (create_node) {
      if ((r=nr_reg_insert_node(name, node)))
        ABORT(r);
      free_node = 0;
    }
    else {
      if (changed) {
        if ((r=nr_reg_change_node(name, node, node)))
          ABORT(r);
        free_node = 0;
      }
    }

    _status=0;
  abort:
    if (_status) {
      if (node && free_node) RFREE(node);
    }
    return(_status);
}

int
nr_reg_set_array(const char *name, unsigned char type, const UCHAR *data, size_t length)
{
    int r, _status;
    nr_array_registry_node *old = 0;
    nr_array_registry_node *node = 0;
    int free_node = 0;
    int added = 0;
    int changed = 0;

    if ((r=nr_reg_fetch_node(name, type, (nr_registry_node **)&old, &free_node))) {
        if (r != R_NOT_FOUND)
            ABORT(r);
    }
    else {
      assert(free_node == 0);
    }

    if (old) {
        if (old->type != type)
            ABORT(R_BAD_ARGS);

        if (old->array.length != length
         || memcmp(old->array.data, data, length)) {
            changed = 1;

            if (old->array.length < length) {
                if (!(node=(nr_array_registry_node*)RCALLOC_RAWSIZE(sizeof(nr_array_registry_node)+length)))
                    ABORT(R_NO_MEMORY);
            }
            else {
                node = old;
            }
        }
    }
    else {
        if (!(node=(nr_array_registry_node*)RCALLOC_RAWSIZE(sizeof(nr_array_registry_node)+length)))
            ABORT(R_NO_MEMORY);

        added = 1;
    }

    if (added || changed) {
        node->type = type;
        node->array.length = length;
        memcpy(node->array.data, data, length);
    }

    if (added) {
        if ((r=nr_reg_insert_node(name, node)))
            ABORT(r);
    }
    else if (changed) {
        if ((r=nr_reg_change_node(name, node, old)))
          ABORT(r);
    }

    _status=0;
  abort:
    return(_status);
}

int
nr_reg_set_parent_registries(const char *name)
{
    int r, _status;
    char *parent = 0;
    char *dot = 0;

    if ((parent = r_strdup(name)) == 0)
      ABORT(R_NO_MEMORY);

    if ((dot = strrchr(parent, '.')) != 0) {
      *dot = '\0';
      if ((r=NR_reg_set_registry(parent)))
        ABORT(r);
    }

    _status=0;
  abort:
    if (parent) RFREE(parent);
    return(_status);
}





/* NON-STATIC METHODS */

int
nr_reg_is_valid(NR_registry_name name)
{
    int _status;
    unsigned int length;
    unsigned int i;

    if (name == 0)
      ABORT(R_BAD_ARGS);

    /* make sure the key is null-terminated */
    if (memchr(name, '\0', sizeof(NR_registry)) == 0)
      ABORT(R_BAD_ARGS);

    length = strlen(name);

    /* cannot begin or end with a period */
    if (name[0] == '.')
      ABORT(R_BAD_ARGS);
    if (strlen(name) > 0 && name[length-1] == '.')
      ABORT(R_BAD_ARGS);

    /* all characters cannot be space, and must be printable and not / */
    for (i = 0; i < length; ++i) {
      if (isspace(name[i]) || !isprint(name[i]) || name[i] == '/')
        ABORT(R_BAD_ARGS);
    }

    _status=0;
  abort:
    if (_status) {
      r_log(NR_LOG_REGISTRY, LOG_DEBUG, "invalid name '%s'", name);
    }
    return(_status);
}


int
nr_reg_compute_length(const char *name, nr_registry_node *in, size_t *length)
{
    int _status;
    nr_array_registry_node *node = (nr_array_registry_node*)in;

    switch (node->type) {
    case NR_REG_TYPE_STRING:
      *length = node->array.length - 1;
      break;
    case NR_REG_TYPE_BYTES:
      *length = node->array.length;
      break;
    case NR_REG_TYPE_CHAR:
      *length = sizeof(char);
      break;
    case NR_REG_TYPE_UCHAR:
      *length = sizeof(UCHAR);
      break;
    case NR_REG_TYPE_INT2:
    case NR_REG_TYPE_UINT2:
      *length = 2;
      break;
    case NR_REG_TYPE_INT4:
    case NR_REG_TYPE_UINT4:
      *length = 4;
      break;
    case NR_REG_TYPE_INT8:
    case NR_REG_TYPE_UINT8:
      *length = 8;
      break;
    case NR_REG_TYPE_DOUBLE:
      *length = sizeof(double);
      break;
    case NR_REG_TYPE_REGISTRY:
      *length = strlen(name);
      break;
    default:
      ABORT(R_INTERNAL);
      break;
    }

    _status=0;
  abort:
    return(_status);
}


int
nr_reg_local_init(void)
{
    int r, _status;

    if (nr_registry == 0) {
      if ((r=r_assoc_create(&nr_registry, r_assoc_crc32_hash_compute, 12)))
        ABORT(r);

      if ((r=nr_reg_cb_init()))
            ABORT(r);

      /* make sure NR_TOP_LEVEL_REGISTRY always exists */
      if ((r=NR_reg_set_registry(NR_TOP_LEVEL_REGISTRY)))
          ABORT(r);
    }

    _status=0;
  abort:
    return(_status);
}

int
nr_reg_local_get_length(NR_registry_name name, size_t *length)
{
    int r, _status;
    nr_registry_node *node = 0;

    if ((r=nr_reg_is_valid(name)))
      ABORT(r);

    if ((r=r_assoc_fetch(nr_registry, name, strlen(name)+1, (void**)&node)))
      ABORT(r);

    if ((r=nr_reg_compute_length(name, node, length)))
      ABORT(r);

    _status=0;
  abort:
    return(_status);
}


int
nr_reg_local_del(NR_registry_name name)
{
    int r, _status;

    if ((r=nr_reg_is_valid(name)))
      ABORT(r);

    /* delete from NR_registry */
    if ((r=nr_reg_local_iter(name, nr_reg_local_iter_delete, 0)))
      ABORT(r);

    if ((r=nr_reg_raise_event(name, NR_REG_CB_ACTION_DELETE)))
      ABORT(r);

    /* if deleting from the root, re-insert the root */
    if (! strcasecmp(name, NR_TOP_LEVEL_REGISTRY)) {
      if ((r=NR_reg_set_registry(NR_TOP_LEVEL_REGISTRY)))
          ABORT(r);
    }

    _status=0;
  abort:
    r_log(NR_LOG_REGISTRY,
          (_status ? LOG_INFO               :  LOG_INFO),
          "delete of '%s' %s", name,
          (_status ? "FAILED"               : "succeeded"));
    return(_status);
}

int
nr_reg_local_get_child_count(NR_registry_name parent, size_t *count)
{
    int r, _status;
    nr_registry_node *ignore1 = 0;
    int ignore2;


    if ((r=nr_reg_is_valid(parent)))
      ABORT(r);

    /* test to see whether it is present */
    if ((r=nr_reg_fetch_node(parent, NR_REG_TYPE_REGISTRY, &ignore1, &ignore2)))
      ABORT(r);

    /* sanity check that there isn't any memory to free */
    assert(ignore2 == 0);

    *count = 0;

    if ((r=nr_reg_local_iter(parent, nr_reg_local_count_children, count)))
      ABORT(r);

    _status=0;
  abort:
    return(_status);
}

int
nr_reg_local_get_children(NR_registry_name parent, NR_registry *data, size_t size, size_t *length)
{
    int r, _status;
    nr_reg_find_children_arg arg;

    if ((r=nr_reg_is_valid(parent)))
      ABORT(r);

    arg.children = data;
    arg.size = size;
    arg.length = 0;

    if ((r=nr_reg_local_iter(parent, nr_reg_local_find_children, (void*)&arg))) {
        if (r == R_INTERRUPTED)
            ABORT(R_BAD_ARGS);
        else
            ABORT(r);
    }

    assert(sizeof(*arg.children) == sizeof(NR_registry));
    qsort(arg.children, arg.length, sizeof(*arg.children), nr_reg_local_compare_string);

    *length = arg.length;

    _status = 0;
  abort:
    return(_status);
}
