// Standalone adapter for the unmodified official falcON core (GPL-2.0-or-later).
// Compile with falcON_DOUBLE; kernel 0 is explicitly the Plummer kernel.
// Source vendor: GalacticDynamics-Oxford/pyfalcon, recorded commit in provenance.
#include <forces.h>
#include <fstream>
#include <iostream>
#include <vector>
#include <chrono>
#include <cmath>
#include <cstring>
#include <cstdint>
int main(int argc,char**argv){try{
 if(argc<7)throw std::runtime_error("input.bin output.bin G epsilon theta steps [dt]");
 if(sizeof(falcON::real)!=8)throw std::runtime_error("Force core is not Float64");
 std::ifstream in(argv[1],std::ios::binary);char magic[8];uint64_t n;in.read(magic,8);in.read(reinterpret_cast<char*>(&n),8);if(std::memcmp(magic,"TCCF6401",8)||!in||n<1||n>10000000)throw std::runtime_error("Invalid input");
 std::vector<double> p(3*n),v(3*n),m(n);std::vector<uint8_t> c(n);in.read(reinterpret_cast<char*>(p.data()),24*n);in.read(reinterpret_cast<char*>(v.data()),24*n);in.read(reinterpret_cast<char*>(m.data()),8*n);in.read(reinterpret_cast<char*>(c.data()),n);if(!in)throw std::runtime_error("Truncated input");
 const double G=std::stod(argv[3]),eps=std::stod(argv[4]),theta=std::stod(argv[5]),dt=argc>7?std::stod(argv[7]):.1;const int steps=std::stoi(argv[6]);unsigned nb[3]={0,0,(unsigned)n};falcON::bodies bodies(nb,falcON::fieldset(falcON::fieldset::gravity));uint64_t i=0;
 for(falcON::body b=bodies.begin_all_bodies();b;++b,++i){b.mass()=m[i];for(int k=0;k<3;k++){b.pos()[k]=p[3*i+k];b.vel()[k]=v[3*i+k];}b.flag_as_active();}
 auto force=[&](){falcON::forces f(&bodies,eps,theta,static_cast<falcON::kern_type>(0),false,G);f.grow();f.approximate_gravity(true);};
 const auto started=std::chrono::steady_clock::now();force();for(int step=0;step<steps;step++){for(falcON::body b=bodies.begin_all_bodies();b;++b){b.vel()+=(.5*dt)*b.acc();b.pos()+=dt*b.vel();}force();for(falcON::body b=bodies.begin_all_bodies();b;++b)b.vel()+=(.5*dt)*b.acc();}
 std::vector<double>a(3*n),phi(n);i=0;for(falcON::body b=bodies.begin_all_bodies();b;++b,++i){for(int k=0;k<3;k++){p[3*i+k]=b.pos()[k];v[3*i+k]=b.vel()[k];a[3*i+k]=b.acc()[k];}phi[i]=b.pot();}
 std::ofstream out(argv[2],std::ios::binary);out.write("TCCF6401",8);out.write(reinterpret_cast<char*>(&n),8);out.write(reinterpret_cast<char*>(p.data()),24*n);out.write(reinterpret_cast<char*>(v.data()),24*n);out.write(reinterpret_cast<char*>(m.data()),8*n);out.write(reinterpret_cast<char*>(c.data()),n);out.write(reinterpret_cast<char*>(a.data()),24*n);out.write(reinterpret_cast<char*>(phi.data()),8*n);if(!out)throw std::runtime_error("Cannot write output");
 const double ms=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-started).count();std::cout<<"{\"n\":"<<n<<",\"precisionBytes\":"<<sizeof(falcON::real)<<",\"kernel\":0,\"theta\":"<<theta<<",\"G\":"<<G<<",\"epsilon\":"<<eps<<",\"steps\":"<<steps<<",\"dt\":"<<dt<<",\"computeAndWriteMs\":"<<ms<<"}"<<std::endl;
 return 0;
}catch(const std::exception&e){std::cerr<<e.what()<<std::endl;return 1;}}
