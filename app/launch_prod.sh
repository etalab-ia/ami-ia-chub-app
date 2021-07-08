#!/bin/bash
if [ $1 == up ]; then
	docker build -t dxcare-webapp:latest .
	docker run -p 80:80 -d --name dxcare-webapp dxcare-webapp:latest
fi;

if [ $1 == down ]; then
    docker kill dxcare-webapp
fi;
