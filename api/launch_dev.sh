#!/bin/bash

if [ $1 == up ]; then
    docker-compose -f docker-compose-dev.yml up --build -d
    docker logs dxcare-webapp-api -f
fi;

if [ $1 == down ]; then
    docker-compose -f docker-compose-dev.yml down
fi;
