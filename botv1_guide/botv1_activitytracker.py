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


#logger = logging.getLogger('discord')
#logger.setLevel(logging.DEBUG)
#handler = logging.FileHandler(filename='discord.log', encoding='utf-8', mode='w')
#handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(name)s: %(message)s'))
#logger.addHandler(handler)


#bPrefix = ("Corn.","CORN.","corn.","COrn.","CORn.")
bot = commands.Bot(command_prefix='api')
#bot_token = 'hhuojklhl.kljlkjkl;.lfgdjkljkl
now = datetime.datetime.now()

class AppURLopener(urllib.request.FancyURLopener):
    version = "Mozilla/5.0"
global dtx
dtx = []

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
async def twitch(channame, botname, otoken):
    try:
       with TwitchChatStream(username=botname,
                             oauth=otoken,
                             verbose=False,
                             tchannel=channame) as chatstream:
           # Send a message to this twitch stream
#           chatstream.send_chat_message("CornBot is Online - Use ' $help ' for details (Follow @bitcornhub to receive Whispers)")
           count = 0
           while True and count < 900:
             global tchatq
             global dtx
             global idleON
             global dTalk
             if dtx:
                ix = 0
                for item in dtx:
                  if dTalk == 1:
                    if "<|DM|>" not in item:
                       uname = item.split("<||>")[0]
                       message = item.split("<||>")[1]
                       chatstream.send_chat_message("%s" % (message))
                    else:
                       uname = item.split("<|DM|>")[0]
                       message = item.split("<|DM|>")[1]
                       chatstream.send_direct_message("%s<||>%s" % (uname,message))
                    del dtx[ix]
                    ix += 1
             received = chatstream.twitch_receive_messages()
             if received:
                for chat_message in received:
                    print("\n *** UPDATING STATS :: '%s' from %s" % (
                        chat_message['message'],
                        chat_message['username']
                    ))
                    db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True)
                    cursor = db.cursor()
                    now = datetime.datetime.now()
                    td = (now.strftime("%m-%d-%Y %H:%M:%S"))
                    cmsg = ''
                    for c in chat_message['message']:
                        cmsg += " " + str(ord(c))
                    SQL = ("INSERT INTO activitytracking (id,twitch_username,message,td,channel) VALUES (NULL,'%s','%s','%s','irc_channel')" % (chat_message['username'],cmsg,td))
                    cursor.execute(SQL)
                    db.commit()
                    cmsg = ''
                    SQL = ("SELECT count(*) FROM activitytracking WHERE twitch_username LIKE '%s'" % (chat_message['username']))
                    cursor.execute(SQL)
                    msgcount = cursor.fetchone()
                    message_count = int(msgcount[0])
                    SQL = ("SELECT * FROM subscribers WHERE twitch_username LIKE '%s'" % (chat_message['username']))
                    cursor.execute(SQL)
                    results = cursor.fetchall()
                    subInfo = None
                    rcount = cursor.rowcount
                    if rcount!= 0:
                       for row in results:
                           subInfo = row[2]
                    SQL = ("SELECT * FROM msg_leaderboards WHERE twitch_username LIKE '%s'" % (chat_message['username']))
                    cursor.execute(SQL)
                    rcount = cursor.rowcount
                    if rcount == 0:
                       SQL = ("INSERT INTO msg_leaderboards (id,twitch_username,message_count,sub_plan,online) VALUE (NULL,'%s','%s','%s','1')" % (chat_message['username'],str(message_count),subInfo))
                       cursor.execute(SQL)
                       db.commit()
                    else:
                       SQL = ("UPDATE msg_leaderboards SET message_count = '%s',sub_plan='%s',online='1' WHERE twitch_username LIKE '%s'" % (str(message_count),subInfo,chat_message['username']))
                       cursor.execute(SQL)
                       db.commit()
                    db.close()
                    db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True)
                    cursor = db.cursor()
                    if '@' in chat_message['message']:
                        cmsg = ''
                        for c in chat_message['message']:
                            cmsg += " " + str(ord(c))
                        taggedUser = chat_message['message'].split(" ")
                        taggedUsers = ""
                        for item in taggedUser:
                            if "@" in item:
                               SQL = ("INSERT INTO notifications (id,twitch_username,message,spent,type) VALUES (NULL,'%s','%s','0','2')" % (item.replace('@',''),'%s Tagged you in Twitch Chat :: %s' % (chat_message['username'],chat_message['message'])))
                               cursor.execute(SQL)
                               db.commit()
                        SQL = ("SELECT * FROM msg_tags WHERE twitch_username LIKE '%s' AND message LIKE '%s'" % (chat_message['username'],cmsg))
                        cursor.execute(SQL)
                        results = cursor.fetchall()
                        rcount = cursor.rowcount
                        if rcount == 0:
                           SQL = ("INSERT INTO msg_tags (id,twitch_username,message,date_time) VALUES (NULL,'%s','%s','%s')" % (chat_message['username'],cmsg,td))
                           cursor.execute(SQL)
                           db.commit()
#                    SQL = ("SELECT * FROM activitytracking WHERE message LIKE '%%%s%%' ORDER BY id ASC" % ("64"))
#                    cursor.execute(SQL)
#                    results = cursor.fetchall()
#                    rcount = cursor.rowcount
#                    for row in results:
#                        SQL = ("SELECT * FROM msg_tags WHERE twitch_username LIKE '%s' AND message LIKE '%s'" % (row[1],row[2]))
#                        cursor.execute(SQL)
#                        results = cursor.fetchall()
#                        rcount = cursor.rowcount
#                        if rcount == 0:
#                           SQL = ("INSERT INTO msg_tags (id,twitch_username,message,date_time) VALUES (NULL,'%s','%s','%s')"  % (row[1],row[2],row[3]))
#                           cursor.execute(SQL)
#                           db.commit()
#                           print(" *** UPDATING TAGS", row[1],row[2],row[3])
                    db.close()
#             print("\n *** UPDATED STATS 2\n")
             await asyncio.sleep(1)
             count += 1
           else:
              chatstream.Break
              bot.bg_task = bot.loop.create_task(bot.twitch("irc_channel","bot_username","irc_oauth:jsjsjsjdfj_example_gkgkgkg"))
    except Exception as e:
         await logit("Auto.Twitch","Error: %s" % (e))
#         bot.bg_task = bot.loop.create_task(bot.twitch("irc_channel","bot_username","irc_oauth:jsjsjsjdfj_example_gkgkgkg"))


loop = asyncio.get_event_loop()
loop.create_task(bot.twitch("irc_channel","bot_username","irc_oauth:jsjsjsjdfj_example_gkgkgkg"))
try:
    loop.run_forever()
finally:
    loop.stop()
