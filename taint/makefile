serializationtest: Taint.o test.o
	g++ Taint.o test.o -o serializationtest

Taint.o : Taint.cpp
	g++ -c Taint.cpp

test.o : test.cpp
	g++ -c test.cpp

clean:
	rm *.o serializationtest 
