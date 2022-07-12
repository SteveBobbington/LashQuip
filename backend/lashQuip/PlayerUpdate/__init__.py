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
    logging.info('Updating Player')

    player = req.get_json()

    try:
        query="SELECT * FROM players p WHERE p.username = '{}'".format(player["username"])
        dupedNames = playersDB.query_items(query=query, enable_cross_partition_query=True)
        for name in dupedNames:
            if name["password"]==player["password"]:
                new_player=name
                try:
                    if player["add_to_games_played"]+name["games_played"]<0:
                        return func.HttpResponse(json.dumps({"result":False, "msg":"Attempt to set negative score/games_played"}))
                    new_player["games_played"]=new_player["games_played"]+player["add_to_games_played"]
                except KeyError:
                    pass
                try:
                    if player["add_to_score"]+name["total_score"]<0:
                        return func.HttpResponse(json.dumps({"result":False, "msg":"Attempt to set negative score/games_played"}))
                    new_player["total_score"]=new_player["total_score"]+player["add_to_score"]
                except KeyError:
                    pass
                playersDB.upsert_item(new_player)
                return func.HttpResponse(json.dumps({"result":True, "msg":"OK"}))
            return func.HttpResponse(json.dumps({"result":True, "msg":"wrong password"}))
    except CosmosHttpResponseError:
        return func.HttpResponse(json.dumps({"result":False, "msg":"that went wrong"}))

    return func.HttpResponse(json.dumps({"result":False, "msg":"user does not exist"}))
