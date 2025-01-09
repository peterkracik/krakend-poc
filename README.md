# krakend-poc

## Overview
This project is a proof of concept (POC) for using KrakenD as an API Gateway. It includes three services:
- Two REST API services
- One GraphQL service

This project is a simple example of an API that provides operations for football teams and matches.

## Services
1. **REST API Service 1**: Provides data for teams.
2. **REST API Service 2**: Provides data for matches.
3. **GraphQL Service**: Provides all data from multiple sources and offers a unified GraphQL endpoint.

## Postman Collections
Postman collections for testing the services are available in the `postman-collection` folder. These collections include predefined requests to interact with the REST and GraphQL services.

## Docker Compose
A `docker-compose.yml` file is included to easily start the project. It sets up the necessary containers for the services and KrakenD.

### How to Run
1. Ensure Docker and Docker Compose are installed on your machine.
2. Navigate to the project directory.
3. Run the following command to start the services:
