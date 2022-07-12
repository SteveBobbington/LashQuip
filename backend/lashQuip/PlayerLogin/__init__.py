import logging
import json
import os

import azure.functions as func
import azure.cosmos.cosmos_client as cosmos_client
from azure.cosmos.exceptions import CosmosHttpResponseError


host = os.environ['ACCOUNT_HOST']
key = os.environ['ACCOUNT_KEY']

client = cosmos_client.CosmosClient(host,credential=key)
database = client.get_database_client('lashQuipDB')
playersDB = database.get_container_client('players')

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Logging in')

    player = req.get_json()

    try:
        query="SELECT * FROM players p WHERE p.username = '{}' AND p.password='{}'".format(player["username"], player["password"])
        dupedNames = playersDB.query_items(query=query, enable_cross_partition_query=True)
        for name in dupedNames:
            return func.HttpResponse(json.dumps({"result":True, "msg":"OK"}))
    except CosmosHttpResponseError:
        return func.HttpResponse(json.dumps({"result":False, "msg":"that went wrong"}))

    return func.HttpResponse(json.dumps({"result":False, "msg":"Username or password incorrect"}))

