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

def main(req: func.HttpRequest, players: func.Out[func.Document]) -> func.HttpResponse:
    logging.info('Adding a User')

    player = req.get_json()
    if len(player["username"])<4:
        return func.HttpResponse(json.dumps({"result":False, "msg":"Username less than 4 characters"}))
    if len(player["username"])>16:
        return func.HttpResponse(json.dumps({"result":False, "msg":"Username more than 16 characters"}))
    if len(player["password"])<8:
        return func.HttpResponse(json.dumps({"result":False, "msg":"Password less than 8 characters"}))
    if len(player["password"])>24:
        return func.HttpResponse(json.dumps({"result":False, "msg":"Password more than 24 characters"}))

    try:
        query="SELECT * FROM players WHERE players.username = '{}'".format(player["username"])
        dupedNames = playersDB.query_items(query=query, enable_cross_partition_query=True)
        for name in dupedNames:
            return func.HttpResponse(json.dumps({"result":False, "msg":"Username already exists"}))
        player["games_played"]=0
        player["total_score"]=0
        players.set(func.Document.from_dict(player))
    except CosmosHttpResponseError:
        return func.HttpResponse(json.dumps({"result":False, "msg":"that went wrong"}))

    return func.HttpResponse(json.dumps({"result":True, "msg":"OK"}))
