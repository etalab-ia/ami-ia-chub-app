#!/bin/bash

if [ $1 == up ]; then
    docker-compose up --build -d
    # docker logs dxcare-webapp-api -f
fi;

if [ $1 == down ]; then
    docker-compose down
fi;
