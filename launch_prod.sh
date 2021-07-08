#!/bin/bash
if [ $1 == up ]; then
	cd api && ./launch_prod.sh up && cd ..
	cd app && ./launch_prod.sh up
fi;

if [ $1 == down ]; then
	cd api && ./launch_prod.sh down && cd ..
	cd app && ./launch_prod.sh down
fi;