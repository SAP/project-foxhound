/**
   r_memory.h


   Copyright (C) 2004, Network Resonance, Inc.
   Copyright (C) 2006, Network Resonance, Inc.
   All Rights Reserved

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:

   1. Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
   2. Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
   3. Neither the name of Network Resonance, Inc. nor the name of any
      contributors to this software may be used to endorse or promote
      products derived from this software without specific prior written
      permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS ``AS IS''
   AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
   LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
   SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
   INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   POSSIBILITY OF SUCH DAMAGE.


   ekr@rtfm.com  Sat Apr 24 08:30:00 2004
 */


#ifndef _r_memory_h
#define _r_memory_h

char *r_strdup(const char *str);

#define NO_MALLOC_REPLACE 1
#ifdef NO_MALLOC_REPLACE

#ifndef RMALLOC
#define RMALLOC(a) malloc(a)
#endif

#ifndef RCALLOC_RAWSIZE
#define RCALLOC_RAWSIZE(a) calloc(1,a)
#endif

#ifndef R_NEW
#define R_NEW(type) (type*)calloc(1,sizeof(type))
#endif

#ifndef R_NEW_CNT
#define R_NEW_CNT(type,cnt) (type*)calloc(cnt,sizeof(type))
#endif

#ifndef RFREE
#define RFREE(a) if(a) free(a)
#endif


#else


void *r_malloc(int type, size_t size);
void *r_calloc(int type,size_t number,size_t size);
void r_free   (void *ptr);

#ifndef R_MALLOC_TYPE
#define R_MALLOC_TYPE   0
#endif

#ifndef RMALLOC
#define RMALLOC(a) r_malloc(R_MALLOC_TYPE,a)
#endif

#ifndef RCALLOC_RAWSIZE
#define RCALLOC_RAWSIZE(a) r_calloc(R_MALLOC_TYPE,1,a)
#endif

#ifndef R_NEW
#define R_NEW(type) (type*)r_calloc(R_MALLOC_TYPE,1,sizeof(type))
#endif

#ifndef R_NEW_CNT
#define R_NEW_CNT(type,cnt) (type*)r_calloc(R_MALLOC_TYPE,cnt,sizeof(type))
#endif

#ifndef RFREE
#define RFREE(a) if(a) r_free(a)
#endif


#endif


#endif

