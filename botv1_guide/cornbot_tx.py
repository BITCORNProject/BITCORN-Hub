from __future__ import print_function
import feedparser
import re
import traceback
import discord
import MySQLdb
import random
import asyncio
import requests
import aiohttp
import datetime
import time
import math
import json
import random
import urllib.request
import urllib.parse
import string
from random import randint
from discord import Game
from discord.ext import commands
from difflib import SequenceMatcher
import socket
import sys
from twitchstream.outputvideo import TwitchOutputStreamRepeater
from twitchstream.chat import TwitchChatStream
import argparse
import numpy as np
from pathlib import Path
import os
import logging


logger = logging.getLogger('discord')
logger.setLevel(logging.DEBUG)
handler = logging.FileHandler(filename='discord.log', encoding='utf-8', mode='w')
handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(name)s: %(message)s'))
logger.addHandler(handler)


bot = commands.Bot(command_prefix='api')

class AppURLopener(urllib.request.FancyURLopener):
    version = "Mozilla/5.0"


async def logit(ln: str= None, info: str = None):
    try:
         now = datetime.datetime.now()
         td = (now.strftime("%m-%d-%Y %H:%M:%S"))
         db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True)
         cursor = db.cursor()
         theinfo = ''
         for character in info:
             if re.match('^[a-zA-Z0-9()$%_/. ,|!:;<>\-=+_\\&^\#@?]*$',character):
                 theinfo += character
         sqllog = ("INSERT INTO botlogs (id, timedate, logname, information) VALUES (NULL, '%s', '%s','%s')" % (td,ln,theinfo))
         cursor.execute(sqllog)
         db.commit()
         db.close()
         print("%s :: %s :: %s" % (td, ln, theinfo))
    except Exception as e:
       print("Error updating logs! :: %s" % (e))

@bot.event
async def txtracker():
      while True:
       try:
         db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True)
         cursor = db.cursor()
         aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
         headers = {'content-type': 'application/json'}
         payload = {
                    "method": "listtransactions",
#                    "params": ["{}".format(str(ctx.message.author.id))],
         }
         response = requests.post(
                aurl, data=json.dumps(payload), headers=headers).json()
         results = response["result"]
         allembeds = []
         tcount = 0
#         results[0]['genrated'] = None
         for item in results:
           if 'generated' not in item and item['category'] != "move":
             embed = discord.Embed(title="CornBot", description="Live Transactions", color=0x11806a)
#             embed.add_field(name="BCCONFIRMATIONS", value=item['bcconfirmations'], inline=False)
             embed.add_field(name="TXID", value=item['txid'], inline=False)
             if item['account'] != '': embed.add_field(name="ACCOUNT", value=item['account'], inline=False)
#             embed.add_field(name="TIME", value=item['time'], inline=False)
#             embed.add_field(name="WALLETCONFLICTS", value=item['walletconflicts'], inline=False)
#             embed.add_field(name="BLOCK INDEX", value=item['blockindex'], inline=False)
             embed.add_field(name="CONFRIMATIONS", value=item['confirmations'], inline=False)
             embed.add_field(name="CATEGORY", value=item['category'], inline=False)
             embed.add_field(name="TIME RECEIVED", value=item['timereceived'], inline=False)
#             embed.add_field(name="BLOCKHASH", value=item['blockhash'], inline=False)
#             embed.add_field(name="VOUT", value=item['vout'], inline=False)
             embed.add_field(name="AMOUNT", value=item['amount'], inline=False)
             embed.add_field(name="ADDRESS", value=item['address'], inline=False)
#             embed.add_field(name="BLOCKTIME", value=item['blocktime'], inline=False)
#             embed.add_field(name="GENERATED", value=item['generated'], inline=False)
             SQL = ("SELECT * FROM txtracking WHERE txid LIKE '%s' AND category LIKE 'receive'" % (item['txid'].replace("'","").replace('"','')))
             cursor.execute(SQL)
             results = cursor.fetchall()
             rcount = cursor.rowcount
             if rcount == 0 and item['category'] != 'send':
              txcomment = None
              try:
                 if item['comment'] != None and item['comment'] != "":
                    txcomment = item['comment']
                 else:
                    txcomment = "tx"
              except:
                pass
              SQL = ("INSERT INTO txtracking (id,account,amount,txid,address,confirmations,category,timereceived,comment) VALUES (NULL,'%s','%s','%s','%s','%s','%s','%s','%s')" % (item['account'],float(item['amount']),item['txid'],item['address'],item['confirmations'],item['category'],item['timereceived'],txcomment))
              cursor.execute(SQL)
              db.commit()
              if item['account'] != "":
                   SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s' OR discordid LIKE '%s'" % (item['account'],item['account']))
                   cursor.execute(SQL)
                   results = cursor.fetchall()
                   rcount = cursor.rowcount
                   if rcount != 0:
                      did = None
                      twun = None
                      pbal = None
                      for row in results:
                          did = row[1]
                          twun = row[2]
                          pbal = row[4]
                      if did == 'NA':
                         finalBal = float(pbal) + float(item['amount'])
                         SQL = ("UPDATE users SET balance = '%.8f' WHERE cornaddy LIKE '%s'" % (float(finalBal),item['address']))
                         cursor.execute(SQL)
                         db.commit()
                   comment = "No Comment"
                   try:
                      if item['comment'] != '' or item['comment'] is not None: comment = "No Comment"
                   except:
                     comment = "No Comment"
                     pass
                   if "%.1f" % float(item['amount']) != "30.0":
                      SQL = ("INSERT INTO notifications (id,twitch_username,message,spent,type) VALUES (NULL,'%s','%s','0','0')" % (item['account'],'Received %s CORN "%s"' % (item['amount'],comment)))
                      cursor.execute(SQL)
                      db.commit()
                      await logit("Incoming Transaction","'Receive' Transaction for %s :: %.8f CORN" % (item['account'],float(item['amount'])))
         db.close()
         await asyncio.sleep(5)
       except Exception as e:
         print("TXERROR: %s" % e)
         await logit("TX-TRACKING-ERROR","Error: %s" % (e))
         bot.bg_task = bot.loop.create_task(bot.txtracker())
         pass

loop = asyncio.get_event_loop()
loop.create_task(bot.txtracker())
try:
    loop.run_forever()
finally:
    loop.stop()


