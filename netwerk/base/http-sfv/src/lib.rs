/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#![expect(
    clippy::unnecessary_wraps,
    clippy::unused_self,
    reason = "These are needed here."
)]

use nserror::{nsresult, NS_ERROR_FAILURE, NS_ERROR_NULL_POINTER, NS_ERROR_UNEXPECTED, NS_OK};
use nsstring::{nsACString, nsCString};
use sfv::{
    BareItem, Decimal, Dictionary, InnerList, Integer, Item, List, ListEntry, Parameters, Token,
};
use sfv::{FieldType as _, Key, Parser};
use std::cell::RefCell;
use std::ops::Deref as _;
use thin_vec::ThinVec;
use xpcom::interfaces::{
    nsISFVBareItem, nsISFVBool, nsISFVByteSeq, nsISFVDecimal, nsISFVDictionary, nsISFVInnerList,
    nsISFVInteger, nsISFVItem, nsISFVItemOrInnerList, nsISFVList, nsISFVParams, nsISFVService,
    nsISFVString, nsISFVToken,
};
use xpcom::{xpcom, xpcom_method, RefPtr, XpCom as _};

#[no_mangle]
#[expect(clippy::missing_safety_doc, reason = "Inherently unsafe.")]
pub unsafe extern "C" fn new_sfv_service(result: *mut *const nsISFVService) {
    let service: RefPtr<SFVService> = SFVService::new();
    RefPtr::new(service.coerce::<nsISFVService>()).forget(&mut *result);
}

#[xpcom(implement(nsISFVService), atomic)]
struct SFVService {}

impl SFVService {
    fn new() -> RefPtr<Self> {
        Self::allocate(InitSFVService {})
    }

    xpcom_method!(parse_dictionary => ParseDictionary(header: *const nsACString) -> *const nsISFVDictionary);
    fn parse_dictionary(&self, header: &nsACString) -> Result<RefPtr<nsISFVDictionary>, nsresult> {
        let parsed_dict: Dictionary = Parser::new(&header).parse().map_err(|_| NS_ERROR_FAILURE)?;
        let sfv_dict = SFVDictionary::new();
        sfv_dict.value.replace(parsed_dict);
        Ok(RefPtr::new(sfv_dict.coerce::<nsISFVDictionary>()))
    }

    xpcom_method!(parse_list => ParseList(field_value: *const nsACString) -> *const nsISFVList);
    fn parse_list(&self, header: &nsACString) -> Result<RefPtr<nsISFVList>, nsresult> {
        let parsed_list: List = Parser::new(&header).parse().map_err(|_| NS_ERROR_FAILURE)?;

        let mut nsi_members = Vec::new();
        for item_or_inner_list in &parsed_list {
            nsi_members.push(interface_from_list_entry(item_or_inner_list)?);
        }
        let sfv_list = SFVList::allocate(InitSFVList {
            members: RefCell::new(nsi_members),
        });
        Ok(RefPtr::new(sfv_list.coerce::<nsISFVList>()))
    }

    xpcom_method!(parse_item => ParseItem(header: *const nsACString) -> *const nsISFVItem);
    fn parse_item(&self, header: &nsACString) -> Result<RefPtr<nsISFVItem>, nsresult> {
        let parsed_item: Item = Parser::new(&header).parse().map_err(|_| NS_ERROR_FAILURE)?;
        interface_from_item(&parsed_item)
    }

    xpcom_method!(new_integer => NewInteger(value: i64) -> *const nsISFVInteger);
    fn new_integer(&self, value: i64) -> Result<RefPtr<nsISFVInteger>, nsresult> {
        Ok(RefPtr::new(
            SFVInteger::new(value).coerce::<nsISFVInteger>(),
        ))
    }

    xpcom_method!(new_decimal => NewDecimal(value: f64) -> *const nsISFVDecimal);
    fn new_decimal(&self, value: f64) -> Result<RefPtr<nsISFVDecimal>, nsresult> {
        Ok(RefPtr::new(
            SFVDecimal::new(value).coerce::<nsISFVDecimal>(),
        ))
    }

    xpcom_method!(new_bool => NewBool(value: bool) -> *const nsISFVBool);
    fn new_bool(&self, value: bool) -> Result<RefPtr<nsISFVBool>, nsresult> {
        Ok(RefPtr::new(SFVBool::new(value).coerce::<nsISFVBool>()))
    }

    xpcom_method!(new_string => NewString(value: *const nsACString) -> *const nsISFVString);
    fn new_string(&self, value: &nsACString) -> Result<RefPtr<nsISFVString>, nsresult> {
        Ok(RefPtr::new(SFVString::new(value).coerce::<nsISFVString>()))
    }

    xpcom_method!(new_token => NewToken(value: *const nsACString) -> *const nsISFVToken);
    fn new_token(&self, value: &nsACString) -> Result<RefPtr<nsISFVToken>, nsresult> {
        Ok(RefPtr::new(SFVToken::new(value).coerce::<nsISFVToken>()))
    }

    xpcom_method!(new_byte_sequence => NewByteSequence(value: *const nsACString) -> *const nsISFVByteSeq);
    fn new_byte_sequence(&self, value: &nsACString) -> Result<RefPtr<nsISFVByteSeq>, nsresult> {
        Ok(RefPtr::new(
            SFVByteSeq::new(value).coerce::<nsISFVByteSeq>(),
        ))
    }

    xpcom_method!(new_parameters => NewParameters() -> *const nsISFVParams);
    fn new_parameters(&self) -> Result<RefPtr<nsISFVParams>, nsresult> {
        Ok(RefPtr::new(SFVParams::new().coerce::<nsISFVParams>()))
    }

    xpcom_method!(new_item => NewItem(value: *const nsISFVBareItem, params:  *const nsISFVParams) -> *const nsISFVItem);
    fn new_item(
        &self,
        value: &nsISFVBareItem,
        params: &nsISFVParams,
    ) -> Result<RefPtr<nsISFVItem>, nsresult> {
        Ok(RefPtr::new(
            SFVItem::new(value, params).coerce::<nsISFVItem>(),
        ))
    }

    xpcom_method!(new_inner_list => NewInnerList(items: *const ThinVec<Option<RefPtr<nsISFVItem>>>, params:  *const nsISFVParams) -> *const nsISFVInnerList);
    fn new_inner_list(
        &self,
        items: &ThinVec<Option<RefPtr<nsISFVItem>>>,
        params: &nsISFVParams,
    ) -> Result<RefPtr<nsISFVInnerList>, nsresult> {
        let items = items
            .iter()
            .cloned()
            .map(|item| item.ok_or(NS_ERROR_NULL_POINTER))
            .collect::<Result<Vec<_>, nsresult>>()?;
        Ok(RefPtr::new(
            SFVInnerList::new(items, params).coerce::<nsISFVInnerList>(),
        ))
    }

    xpcom_method!(new_list => NewList(members: *const ThinVec<Option<RefPtr<nsISFVItemOrInnerList>>>) -> *const nsISFVList);
    fn new_list(
        &self,
        members: &ThinVec<Option<RefPtr<nsISFVItemOrInnerList>>>,
    ) -> Result<RefPtr<nsISFVList>, nsresult> {
        let members = members
            .iter()
            .cloned()
            .map(|item| item.ok_or(NS_ERROR_NULL_POINTER))
            .collect::<Result<Vec<_>, nsresult>>()?;
        Ok(RefPtr::new(SFVList::new(members).coerce::<nsISFVList>()))
    }

    xpcom_method!(new_dictionary => NewDictionary() -> *const nsISFVDictionary);
    fn new_dictionary(&self) -> Result<RefPtr<nsISFVDictionary>, nsresult> {
        Ok(RefPtr::new(
            SFVDictionary::new().coerce::<nsISFVDictionary>(),
        ))
    }
}

#[xpcom(implement(nsISFVInteger, nsISFVBareItem), nonatomic)]
struct SFVInteger {
    value: RefCell<i64>,
}

impl SFVInteger {
    fn new(value: i64) -> RefPtr<Self> {
        Self::allocate(InitSFVInteger {
            value: RefCell::new(value),
        })
    }

    xpcom_method!(get_value => GetValue() -> i64);
    fn get_value(&self) -> Result<i64, nsresult> {
        Ok(*self.value.borrow())
    }

    xpcom_method!(set_value => SetValue(value: i64));
    fn set_value(&self, value: i64) -> Result<(), nsresult> {
        self.value.replace(value);
        Ok(())
    }

    xpcom_method!(get_type => GetType() -> i32);
    const fn get_type(&self) -> Result<i32, nsresult> {
        Ok(nsISFVBareItem::INTEGER)
    }

    const fn from_bare_item_interface(obj: &nsISFVBareItem) -> &Self {
        unsafe { &*std::ptr::from_ref::<nsISFVBareItem>(obj).cast::<Self>() }
    }
}

#[xpcom(implement(nsISFVBool, nsISFVBareItem), nonatomic)]
struct SFVBool {
    value: RefCell<bool>,
}

impl SFVBool {
    fn new(value: bool) -> RefPtr<Self> {
        Self::allocate(InitSFVBool {
            value: RefCell::new(value),
        })
    }

    xpcom_method!(get_value => GetValue() -> bool);
    fn get_value(&self) -> Result<bool, nsresult> {
        Ok(*self.value.borrow())
    }

    xpcom_method!(set_value => SetValue(value: bool));
    fn set_value(&self, value: bool) -> Result<(), nsresult> {
        self.value.replace(value);
        Ok(())
    }

    xpcom_method!(get_type => GetType() -> i32);
    const fn get_type(&self) -> Result<i32, nsresult> {
        Ok(nsISFVBareItem::BOOL)
    }

    const fn from_bare_item_interface(obj: &nsISFVBareItem) -> &Self {
        unsafe { &*std::ptr::from_ref::<nsISFVBareItem>(obj).cast::<Self>() }
    }
}

#[xpcom(implement(nsISFVString, nsISFVBareItem), nonatomic)]
struct SFVString {
    value: RefCell<nsCString>,
}

impl SFVString {
    fn new(value: &nsACString) -> RefPtr<Self> {
        Self::allocate(InitSFVString {
            value: RefCell::new(nsCString::from(value)),
        })
    }

    xpcom_method!(
        get_value => GetValue(
        ) -> nsACString
    );

    fn get_value(&self) -> Result<nsCString, nsresult> {
        Ok(self.value.borrow().clone())
    }

    xpcom_method!(
        set_value => SetValue(value: *const nsACString)
    );

    fn set_value(&self, value: &nsACString) -> Result<(), nsresult> {
        self.value.borrow_mut().assign(value);
        Ok(())
    }

    xpcom_method!(get_type => GetType() -> i32);
    const fn get_type(&self) -> Result<i32, nsresult> {
        Ok(nsISFVBareItem::STRING)
    }

    const fn from_bare_item_interface(obj: &nsISFVBareItem) -> &Self {
        unsafe { &*std::ptr::from_ref::<nsISFVBareItem>(obj).cast::<Self>() }
    }
}

#[xpcom(implement(nsISFVToken, nsISFVBareItem), nonatomic)]
struct SFVToken {
    value: RefCell<nsCString>,
}

impl SFVToken {
    fn new(value: &nsACString) -> RefPtr<Self> {
        Self::allocate(InitSFVToken {
            value: RefCell::new(nsCString::from(value)),
        })
    }

    xpcom_method!(
        get_value => GetValue(
        ) -> nsACString
    );

    fn get_value(&self) -> Result<nsCString, nsresult> {
        Ok(self.value.borrow().clone())
    }

    xpcom_method!(
        set_value => SetValue(value: *const nsACString)
    );

    fn set_value(&self, value: &nsACString) -> Result<(), nsresult> {
        self.value.borrow_mut().assign(value);
        Ok(())
    }

    xpcom_method!(get_type => GetType() -> i32);
    const fn get_type(&self) -> Result<i32, nsresult> {
        Ok(nsISFVBareItem::TOKEN)
    }

    const fn from_bare_item_interface(obj: &nsISFVBareItem) -> &Self {
        unsafe { &*std::ptr::from_ref::<nsISFVBareItem>(obj).cast::<Self>() }
    }
}

#[xpcom(implement(nsISFVByteSeq, nsISFVBareItem), nonatomic)]
struct SFVByteSeq {
    value: RefCell<nsCString>,
}

impl SFVByteSeq {
    fn new(value: &nsACString) -> RefPtr<Self> {
        Self::allocate(InitSFVByteSeq {
            value: RefCell::new(nsCString::from(value)),
        })
    }

    xpcom_method!(
        get_value => GetValue(
        ) -> nsACString
    );

    fn get_value(&self) -> Result<nsCString, nsresult> {
        Ok(self.value.borrow().clone())
    }

    xpcom_method!(
        set_value => SetValue(value: *const nsACString)
    );

    fn set_value(&self, value: &nsACString) -> Result<(), nsresult> {
        self.value.borrow_mut().assign(value);
        Ok(())
    }

    xpcom_method!(get_type => GetType() -> i32);
    const fn get_type(&self) -> Result<i32, nsresult> {
        Ok(nsISFVBareItem::BYTE_SEQUENCE)
    }

    const fn from_bare_item_interface(obj: &nsISFVBareItem) -> &Self {
        unsafe { &*std::ptr::from_ref::<nsISFVBareItem>(obj).cast::<Self>() }
    }
}

#[xpcom(implement(nsISFVDecimal, nsISFVBareItem), nonatomic)]
struct SFVDecimal {
    value: RefCell<f64>,
}

impl SFVDecimal {
    fn new(value: f64) -> RefPtr<Self> {
        Self::allocate(InitSFVDecimal {
            value: RefCell::new(value),
        })
    }

    xpcom_method!(
        get_value => GetValue(
        ) -> f64
    );

    fn get_value(&self) -> Result<f64, nsresult> {
        Ok(*self.value.borrow())
    }

    xpcom_method!(
        set_value => SetValue(value: f64)
    );

    fn set_value(&self, value: f64) -> Result<(), nsresult> {
        self.value.replace(value);
        Ok(())
    }

    xpcom_method!(get_type => GetType() -> i32);
    const fn get_type(&self) -> Result<i32, nsresult> {
        Ok(nsISFVBareItem::DECIMAL)
    }

    const fn from_bare_item_interface(obj: &nsISFVBareItem) -> &Self {
        unsafe { &*std::ptr::from_ref::<nsISFVBareItem>(obj).cast::<Self>() }
    }
}

#[xpcom(implement(nsISFVParams), nonatomic)]
struct SFVParams {
    params: RefCell<Parameters>,
}

impl SFVParams {
    fn new() -> RefPtr<Self> {
        Self::allocate(InitSFVParams {
            params: RefCell::new(Parameters::new()),
        })
    }

    xpcom_method!(
        get => Get(key: *const nsACString) -> *const nsISFVBareItem
    );

    fn get(&self, key: &nsACString) -> Result<RefPtr<nsISFVBareItem>, nsresult> {
        let key = key.to_utf8();
        let params = self.params.borrow();
        let param_val = params.get(key.as_ref());

        param_val.map_or_else(|| Err(NS_ERROR_UNEXPECTED), interface_from_bare_item)
    }

    xpcom_method!(
        set => Set(key: *const nsACString, item: *const nsISFVBareItem)
    );

    fn set(&self, key: &nsACString, item: &nsISFVBareItem) -> Result<(), nsresult> {
        let Ok(key) = Key::from_string(key.to_utf8().into_owned()) else {
            return Err(NS_ERROR_UNEXPECTED);
        };
        let bare_item = bare_item_from_interface(item)?;
        self.params.borrow_mut().insert(key, bare_item);
        Ok(())
    }

    xpcom_method!(
        delete => Delete(key: *const nsACString)
    );
    fn delete(&self, key: &nsACString) -> Result<(), nsresult> {
        let key = key.to_utf8();
        let mut params = self.params.borrow_mut();

        if !params.contains_key(key.as_ref()) {
            return Err(NS_ERROR_UNEXPECTED);
        }

        // Keeps only entries that don't match key
        params.retain(|k, _| k.as_str() != key.as_ref());
        Ok(())
    }

    xpcom_method!(
        keys => Keys() -> ThinVec<nsCString>
    );
    fn keys(&self) -> Result<ThinVec<nsCString>, nsresult> {
        let keys = self.params.borrow();
        let keys = keys
            .keys()
            .map(|key| nsCString::from(key.as_str()))
            .collect::<ThinVec<nsCString>>();
        Ok(keys)
    }

    const fn from_interface(obj: &nsISFVParams) -> &Self {
        unsafe { &*std::ptr::from_ref::<nsISFVParams>(obj).cast::<Self>() }
    }
}

#[xpcom(implement(nsISFVItem, nsISFVItemOrInnerList), nonatomic)]
struct SFVItem {
    value: RefPtr<nsISFVBareItem>,
    params: RefPtr<nsISFVParams>,
}

impl SFVItem {
    fn new(value: &nsISFVBareItem, params: &nsISFVParams) -> RefPtr<Self> {
        Self::allocate(InitSFVItem {
            value: RefPtr::new(value),
            params: RefPtr::new(params),
        })
    }

    xpcom_method!(
        get_value => GetValue(
        ) -> *const nsISFVBareItem
    );

    fn get_value(&self) -> Result<RefPtr<nsISFVBareItem>, nsresult> {
        Ok(self.value.clone())
    }

    xpcom_method!(
        get_params => GetParams(
        ) -> *const nsISFVParams
    );
    fn get_params(&self) -> Result<RefPtr<nsISFVParams>, nsresult> {
        Ok(self.params.clone())
    }

    xpcom_method!(
        serialize => Serialize() -> nsACString
    );
    fn serialize(&self) -> Result<nsCString, nsresult> {
        let bare_item = bare_item_from_interface(&self.value)?;
        let params = params_from_interface(&self.params)?;
        let serialized = Item::with_params(bare_item, params).serialize();
        Ok(nsCString::from(serialized))
    }

    const fn from_interface(obj: &nsISFVItem) -> &Self {
        unsafe { &*std::ptr::from_ref::<nsISFVItem>(obj).cast::<Self>() }
    }
}

#[xpcom(implement(nsISFVInnerList, nsISFVItemOrInnerList), nonatomic)]
struct SFVInnerList {
    items: RefCell<Vec<RefPtr<nsISFVItem>>>,
    params: RefPtr<nsISFVParams>,
}

impl SFVInnerList {
    fn new(items: Vec<RefPtr<nsISFVItem>>, params: &nsISFVParams) -> RefPtr<Self> {
        Self::allocate(InitSFVInnerList {
            items: RefCell::new(items),
            params: RefPtr::new(params),
        })
    }

    xpcom_method!(
        get_items => GetItems() -> ThinVec<Option<RefPtr<nsISFVItem>>>
    );

    fn get_items(&self) -> Result<ThinVec<Option<RefPtr<nsISFVItem>>>, nsresult> {
        let items = self.items.borrow().iter().cloned().map(Some).collect();
        Ok(items)
    }

    #[expect(non_snake_case, reason = "XPCom method naming convention.")]
    unsafe fn SetItems(&self, value: *const ThinVec<Option<RefPtr<nsISFVItem>>>) -> nsresult {
        if value.is_null() {
            return NS_ERROR_NULL_POINTER;
        }
        match (*value)
            .iter()
            .map(|v| v.clone().ok_or(NS_ERROR_NULL_POINTER))
            .collect::<Result<Vec<_>, nsresult>>()
        {
            Ok(value) => *self.items.borrow_mut() = value,
            Err(rv) => return rv,
        }
        NS_OK
    }

    xpcom_method!(
        get_params => GetParams(
        ) -> *const nsISFVParams
    );
    fn get_params(&self) -> Result<RefPtr<nsISFVParams>, nsresult> {
        Ok(self.params.clone())
    }

    const fn from_interface(obj: &nsISFVInnerList) -> &Self {
        unsafe { &*std::ptr::from_ref::<nsISFVInnerList>(obj).cast::<Self>() }
    }
}

#[xpcom(implement(nsISFVList, nsISFVSerialize), nonatomic)]
struct SFVList {
    members: RefCell<Vec<RefPtr<nsISFVItemOrInnerList>>>,
}

impl SFVList {
    fn new(members: Vec<RefPtr<nsISFVItemOrInnerList>>) -> RefPtr<Self> {
        Self::allocate(InitSFVList {
            members: RefCell::new(members),
        })
    }

    xpcom_method!(
        get_members => GetMembers() -> ThinVec<Option<RefPtr<nsISFVItemOrInnerList>>>
    );

    fn get_members(&self) -> Result<ThinVec<Option<RefPtr<nsISFVItemOrInnerList>>>, nsresult> {
        Ok(self.members.borrow().iter().cloned().map(Some).collect())
    }

    #[expect(non_snake_case, reason = "XPCom method naming convention.")]
    unsafe fn SetMembers(
        &self,
        value: *const ThinVec<Option<RefPtr<nsISFVItemOrInnerList>>>,
    ) -> nsresult {
        if value.is_null() {
            return NS_ERROR_NULL_POINTER;
        }
        match (*value)
            .iter()
            .map(|v| v.clone().ok_or(NS_ERROR_NULL_POINTER))
            .collect::<Result<Vec<_>, nsresult>>()
        {
            Ok(value) => *self.members.borrow_mut() = value,
            Err(rv) => return rv,
        }
        NS_OK
    }

    xpcom_method!(
        parse_more => ParseMore(header: *const nsACString)
    );
    fn parse_more(&self, header: &nsACString) -> Result<(), nsresult> {
        // create List from SFVList
        let mut list = List::new();
        let members = self.members.borrow().clone();
        for interface_entry in &members {
            let item_or_inner_list = list_entry_from_interface(interface_entry)?;
            list.push(item_or_inner_list);
        }

        Parser::new(&header)
            .parse_list_with_visitor(&mut list)
            .map_err(|_| NS_ERROR_FAILURE)?;

        // replace SFVList's members with new_members
        let mut new_members = Vec::new();
        for item_or_inner_list in &list {
            new_members.push(interface_from_list_entry(item_or_inner_list)?);
        }
        self.members.replace(new_members);
        Ok(())
    }

    xpcom_method!(
        serialize => Serialize() -> nsACString
    );
    fn serialize(&self) -> Result<nsCString, nsresult> {
        let mut list = List::new();
        let members = self.members.borrow().clone();
        for interface_entry in &members {
            let item_or_inner_list = list_entry_from_interface(interface_entry)?;
            list.push(item_or_inner_list);
        }

        let Some(serialized) = list.serialize() else {
            return Err(NS_ERROR_FAILURE);
        };
        Ok(nsCString::from(serialized))
    }
}

#[xpcom(implement(nsISFVDictionary, nsISFVSerialize), nonatomic)]
struct SFVDictionary {
    value: RefCell<Dictionary>,
}

impl SFVDictionary {
    fn new() -> RefPtr<Self> {
        Self::allocate(InitSFVDictionary {
            value: RefCell::new(Dictionary::new()),
        })
    }

    xpcom_method!(
        get => Get(key: *const nsACString) -> *const nsISFVItemOrInnerList
    );

    fn get(&self, key: &nsACString) -> Result<RefPtr<nsISFVItemOrInnerList>, nsresult> {
        let key = key.to_utf8();
        let value = self.value.borrow();
        let member_value = value.get(key.as_ref());

        member_value.map_or_else(|| Err(NS_ERROR_UNEXPECTED), interface_from_list_entry)
    }

    xpcom_method!(
        set => Set(key: *const nsACString, item: *const nsISFVItemOrInnerList)
    );

    fn set(&self, key: &nsACString, member_value: &nsISFVItemOrInnerList) -> Result<(), nsresult> {
        let Ok(key) = Key::from_string(key.to_utf8().into_owned()) else {
            return Err(NS_ERROR_UNEXPECTED);
        };
        let value = list_entry_from_interface(member_value)?;
        self.value.borrow_mut().insert(key, value);
        Ok(())
    }

    xpcom_method!(
        delete => Delete(key: *const nsACString)
    );

    fn delete(&self, key: &nsACString) -> Result<(), nsresult> {
        let key = key.to_utf8();
        let mut params = self.value.borrow_mut();

        if !params.contains_key(key.as_ref()) {
            return Err(NS_ERROR_UNEXPECTED);
        }

        // Keeps only entries that don't match key
        params.retain(|k, _| k.as_str() != key.as_ref());
        Ok(())
    }

    xpcom_method!(
        keys => Keys() -> ThinVec<nsCString>
    );
    fn keys(&self) -> Result<ThinVec<nsCString>, nsresult> {
        let members = self.value.borrow();
        let keys = members
            .keys()
            .map(|key| nsCString::from(key.as_str()))
            .collect::<ThinVec<nsCString>>();
        Ok(keys)
    }

    xpcom_method!(
        parse_more => ParseMore(header: *const nsACString)
    );
    fn parse_more(&self, header: &nsACString) -> Result<(), nsresult> {
        Parser::new(&header)
            .parse_dictionary_with_visitor(&mut *self.value.borrow_mut())
            .map_err(|_| NS_ERROR_FAILURE)?;
        Ok(())
    }

    xpcom_method!(
        serialize => Serialize() -> nsACString
    );
    fn serialize(&self) -> Result<nsCString, nsresult> {
        let Some(serialized) = self.value.borrow().serialize() else {
            return Err(NS_ERROR_FAILURE);
        };
        Ok(nsCString::from(serialized))
    }
}

fn bare_item_from_interface(obj: &nsISFVBareItem) -> Result<BareItem, nsresult> {
    let obj = obj
        .query_interface::<nsISFVBareItem>()
        .ok_or(NS_ERROR_UNEXPECTED)?;
    let mut obj_type: i32 = -1;
    unsafe {
        obj.deref().GetType(&mut obj_type);
    }

    match obj_type {
        nsISFVBareItem::BOOL => {
            let item_value = SFVBool::from_bare_item_interface(&obj).get_value()?;
            Ok(BareItem::Boolean(item_value))
        }
        nsISFVBareItem::STRING => {
            let string_itm = SFVString::from_bare_item_interface(&obj).get_value()?;
            let item_value = sfv::String::from_string((*string_itm.to_utf8()).to_string())
                .map_err(|_| NS_ERROR_UNEXPECTED)?;
            Ok(BareItem::String(item_value))
        }
        nsISFVBareItem::TOKEN => {
            let token_itm = SFVToken::from_bare_item_interface(&obj).get_value()?;
            let item_value = Token::from_string((*token_itm.to_utf8()).to_string())
                .map_err(|_| NS_ERROR_UNEXPECTED)?;
            Ok(BareItem::Token(item_value))
        }
        nsISFVBareItem::INTEGER => {
            let item_value =
                Integer::constant(SFVInteger::from_bare_item_interface(&obj).get_value()?);
            Ok(BareItem::Integer(item_value))
        }
        nsISFVBareItem::DECIMAL => {
            let item_value = SFVDecimal::from_bare_item_interface(&obj).get_value()?;
            let decimal: Decimal =
                Decimal::try_from(item_value).map_err(|_| NS_ERROR_UNEXPECTED)?;
            Ok(BareItem::Decimal(decimal))
        }
        nsISFVBareItem::BYTE_SEQUENCE => {
            let token_itm = SFVByteSeq::from_bare_item_interface(&obj).get_value()?;
            let item_value: String = (*token_itm.to_utf8()).to_string();
            Ok(BareItem::ByteSequence(item_value.into_bytes()))
        }
        _ => Err(NS_ERROR_UNEXPECTED),
    }
}

fn params_from_interface(obj: &nsISFVParams) -> Result<Parameters, nsresult> {
    let params = SFVParams::from_interface(obj).params.borrow();
    Ok(params.clone())
}

fn item_from_interface(obj: &nsISFVItem) -> Result<Item, nsresult> {
    let sfv_item = SFVItem::from_interface(obj);
    let bare_item = bare_item_from_interface(&sfv_item.value)?;
    let parameters = params_from_interface(&sfv_item.params)?;
    Ok(Item::with_params(bare_item, parameters))
}

fn inner_list_from_interface(obj: &nsISFVInnerList) -> Result<InnerList, nsresult> {
    let sfv_inner_list = SFVInnerList::from_interface(obj);

    let mut inner_list_items: Vec<Item> = vec![];
    for item in sfv_inner_list.items.borrow().iter() {
        let item = item_from_interface(item)?;
        inner_list_items.push(item);
    }
    let inner_list_params = params_from_interface(&sfv_inner_list.params)?;
    Ok(InnerList::with_params(inner_list_items, inner_list_params))
}

fn list_entry_from_interface(obj: &nsISFVItemOrInnerList) -> Result<ListEntry, nsresult> {
    if let Some(nsi_item) = obj.query_interface::<nsISFVItem>() {
        let item = item_from_interface(&nsi_item)?;
        Ok(ListEntry::Item(item))
    } else if let Some(nsi_inner_list) = obj.query_interface::<nsISFVInnerList>() {
        let inner_list = inner_list_from_interface(&nsi_inner_list)?;
        Ok(ListEntry::InnerList(inner_list))
    } else {
        Err(NS_ERROR_UNEXPECTED)
    }
}

fn interface_from_bare_item(bare_item: &BareItem) -> Result<RefPtr<nsISFVBareItem>, nsresult> {
    let bare_item = match bare_item {
        BareItem::Boolean(val) => RefPtr::new(SFVBool::new(*val).coerce::<nsISFVBareItem>()),
        BareItem::String(val) => {
            RefPtr::new(SFVString::new(&nsCString::from(val.as_str())).coerce::<nsISFVBareItem>())
        }
        BareItem::Token(val) => {
            RefPtr::new(SFVToken::new(&nsCString::from(val.as_str())).coerce::<nsISFVBareItem>())
        }
        BareItem::ByteSequence(val) => RefPtr::new(
            SFVByteSeq::new(&nsCString::from(
                String::from_utf8(val.clone()).map_err(|_| NS_ERROR_UNEXPECTED)?,
            ))
            .coerce::<nsISFVBareItem>(),
        ),
        BareItem::Decimal(val) => {
            let val = val
                .to_string()
                .parse::<f64>()
                .map_err(|_| NS_ERROR_UNEXPECTED)?;
            RefPtr::new(SFVDecimal::new(val).coerce::<nsISFVBareItem>())
        }
        BareItem::Integer(val) => {
            RefPtr::new(SFVInteger::new((*val).into()).coerce::<nsISFVBareItem>())
        }
        _ => return Err(NS_ERROR_UNEXPECTED), // TODO: Handle other BareItem types.
    };

    Ok(bare_item)
}

fn interface_from_item(item: &Item) -> Result<RefPtr<nsISFVItem>, nsresult> {
    let nsi_bare_item = interface_from_bare_item(&item.bare_item)?;
    let nsi_params = interface_from_params(&item.params)?;
    Ok(RefPtr::new(
        SFVItem::new(&nsi_bare_item, &nsi_params).coerce::<nsISFVItem>(),
    ))
}

fn interface_from_params(params: &Parameters) -> Result<RefPtr<nsISFVParams>, nsresult> {
    let sfv_params = SFVParams::new();
    for (key, value) in params {
        sfv_params
            .params
            .borrow_mut()
            .insert(key.clone(), value.clone());
    }
    Ok(RefPtr::new(sfv_params.coerce::<nsISFVParams>()))
}

fn interface_from_list_entry(
    member: &ListEntry,
) -> Result<RefPtr<nsISFVItemOrInnerList>, nsresult> {
    match member {
        ListEntry::Item(item) => {
            let nsi_bare_item = interface_from_bare_item(&item.bare_item)?;
            let nsi_params = interface_from_params(&item.params)?;
            Ok(RefPtr::new(
                SFVItem::new(&nsi_bare_item, &nsi_params).coerce::<nsISFVItemOrInnerList>(),
            ))
        }
        ListEntry::InnerList(inner_list) => {
            let mut nsi_inner_list = Vec::new();
            for item in &inner_list.items {
                let nsi_item = interface_from_item(item)?;
                nsi_inner_list.push(nsi_item);
            }

            let nsi_params = interface_from_params(&inner_list.params)?;
            Ok(RefPtr::new(
                SFVInnerList::new(nsi_inner_list, &nsi_params).coerce::<nsISFVItemOrInnerList>(),
            ))
        }
    }
}
