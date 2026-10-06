var re = /foo/g;
re.lastIndex = {};
var obj = Object.create(re);

function read() {
  return obj.lastIndex;
}

for (var i = 0; i < 50; i++) read();

re.exec("foofoofoo");

read();
