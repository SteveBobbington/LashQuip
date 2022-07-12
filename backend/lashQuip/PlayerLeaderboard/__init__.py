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
    logging.info('Getting leaderboard')

    top = req.get_json()["top"]

    try:
        query="SELECT TOP %s p.username, p.total_score, p.games_played FROM players p ORDER BY p.total_score DESC, p.username ASC" % top
        players = playersDB.query_items(query=query, enable_cross_partition_query=True)
        result=[]
        for player in players:
            dictPlayer=eval(str(player))
            result.append({"username":dictPlayer["username"], "score":dictPlayer["total_score"], "games_played":dictPlayer["games_played"]})
        return func.HttpResponse(json.dumps(result))
    except CosmosHttpResponseError:
        return func.HttpResponse(json.dumps({"result":False, "msg":"that went wrong"}))

    return func.HttpResponse(json.dumps({"result":False, "msg":"there are no users"}))
