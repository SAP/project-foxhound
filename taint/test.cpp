#include "Taint.h"
#include <iostream>
#include <string>
#include <vector>
#include <array>
#include <bits/stdc++.h>
#include <sstream>

using std::string;
using namespace std;

// [{begin: 10, end: 20, source: 'src1'}, {begin: 80, end: 90, source: 'src2'}]

int main() {
/*
string s =" [{begin: 10, end: 20, source: 'src1'}, {begin: 80, end: 90, source: 'src2'}]";

 StringTaint st = ParseTaint(s);
 */


  TaintRange r=TaintRange(02,10,TaintOperation("src1"));
  StringTaint s=StringTaint(r);
  s.append(TaintRange(50,60,TaintOperation("src2")));


  string str=serializeStringtaint(s);

  std::cout << str << std::endl;
  

}
