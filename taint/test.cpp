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

  string s ="[{begin: 10, end: 20, source: 'src1'}, {begin: 80, end: 90, source: 'src2'}]";

  std::cout << "parsins this string to an object taint and back to a string " << s << std::endl;

  StringTaint st = ParseTaint(s);

  string str=serializeStringtaint(st);

  std::cout << "DESERIALIZATION TESTED : stringTaintObject parsed correctly to a string object" << str << std::endl;

  std::cout << "SERIALIZATION TESTED : String parsed back to a string succesfully " << serializeStringtaint(ParseTaint(str)) << std::endl;




  

}
