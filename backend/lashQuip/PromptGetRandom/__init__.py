import logging
import json
import os
import random

import azure.functions as func
import azure.cosmos.cosmos_client as cosmos_client
from azure.cosmos.exceptions import CosmosHttpResponseError


host = os.environ['ACCOUNT_HOST']
key = os.environ['ACCOUNT_KEY']

client = cosmos_client.CosmosClient(host,credential=key)
database = client.get_database_client('lashQuipDB')
promptsDB = database.get_container_client('prompts')

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Getting a Prompt')

    number = req.get_json()["n"]

    try:
        result=[]
        query="SELECT* FROM prompts"
        allPrompts = promptsDB.query_items(query=query, enable_cross_partition_query=True)
        for prompt in allPrompts:
            result.append(eval(str(prompt)))
    except CosmosHttpResponseError:
        return func.HttpResponse(json.dumps({"result":False, "msg":"that went wrong"}))
    try:
        return func.HttpResponse(json.dumps(random.sample(result, number)))
    except ValueError:
        return func.HttpResponse(json.dumps({"result":False, "msg":"not enough prompts saved"}))
