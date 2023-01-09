#include "Taint.h"
#include <iostream>
#include <string>
#include <vector>
#include <array>
#include <bits/stdc++.h>
#include <sstream>

using std::string;
using namespace std;




string convertToString(TaintRange range) 
{

  stringstream ss1 , ss2 ,ss3 ,ss4;
  ss1 << range.begin();
  string begin = ss1.str();
  ss2 << range.end();
  string end = ss2.str();
  ss3 << range.flow().source().name();
  string source = ss3.str();
  ss4 << range.flow().head()->operation().name();
  string sink = ss4.str();

  return "begin : " + begin + ", end : " + end  +", source : " + source + ", sink : " + sink;
}

string deserializeStringtaint(StringTaint taintstr) {
  std::string s = "[";
  bool nonempty=false;
  for (auto& range : taintstr) {
    nonempty=true;
    s +="{";
    s += convertToString(range);
    s +="},";  }

    if (nonempty) {
    s=s.substr(0,s.length()-1);
    }
    
  s += "]";
    
  return s;
}

// [{begin: 10, end: 20, source: 'src1'}, {begin: 80, end: 90, source: 'src2'}]
int main() {

  TaintRange r=TaintRange(02,10,TaintOperation("src1"));
  StringTaint s=StringTaint(r);
  s.append(TaintRange(60,50,TaintOperation("src2")));

  /*StringTaint s;*/
  string str=deserializeStringtaint(s);

  std::cout << str << std::endl;
}
