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
promptsDB = database.get_container_client('prompts')

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Editing a Prompt')

    prompt = req.get_json()
    if len(prompt["text"])<10:
        return func.HttpResponse(json.dumps({"result":False, "msg":"prompt is less than 10 characters"}))
    if len(prompt["text"])>100:
        return func.HttpResponse(json.dumps({"result":False, "msg":"prompt more than 100 characters"}))

    try:
        query="SELECT * FROM players p WHERE p.username = '{}' AND p.password = '{}'".format(prompt["username"], prompt["password"])
        selectedPlayer = playersDB.query_items(query=query, enable_cross_partition_query=True)
        for player in selectedPlayer:
            query2="SELECT * FROM prompts p WHERE p.username = '{}' AND p.text = '{}'".format(prompt["username"], prompt["text"])
            dupedPrompts = promptsDB.query_items(query=query2, enable_cross_partition_query=True)
            for prompt in dupedPrompts:
                return func.HttpResponse(json.dumps({"result":False, "msg":"user already has a prompt with the same text"}))
            query3="SELECT * FROM prompts p WHERE p.username = '{}' AND p.id = '{}'".format(prompt["username"], prompt["id"])
            selectedPrompts = promptsDB.query_items(query=query3, enable_cross_partition_query=True)
            for selectedPrompt in selectedPrompts:
                new_prompt={"id":str(prompt["id"]), "username":prompt["username"], "text":prompt["text"]}
                promptsDB.upsert_item(new_prompt)
                return func.HttpResponse(json.dumps({"result":True, "msg":"OK"}))
            return func.HttpResponse(json.dumps({"result":False, "msg":"prompt id does not exist"}))
    except CosmosHttpResponseError:
        return func.HttpResponse(json.dumps({"result":False, "msg":"that went wrong"}))

    return func.HttpResponse(json.dumps({"result":False, "msg":"bad username or password"}))
