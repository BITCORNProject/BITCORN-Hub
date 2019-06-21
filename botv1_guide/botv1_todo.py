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
#bot_token = 'NTMwNjUzMjA0MzU5MjgyNjkw.DxCg9g.ZLTkb2ICIRGjTNCKQagRfCPCSJU'
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
                             verbose=True,
                             tchannel=channame) as chatstream:
           # Send a message to this twitch stream
#           chatstream.send_chat_message("CornBot is Online - Use ' $help ' for details (Follow @bitcornhub to receive Whispers)")
           count = 0
           while True and count < 3000:
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
#                    print("Got a message '%s' from %s" % (
#                        chat_message['message'],
#                        chat_message['username']
#                    ))
                    now = datetime.datetime.now()
                    td = (now.strftime("%m-%d-%Y %H:%M:%S"))
                    cmsg = ''
                    for c in chat_message['message']:
                        cmsg += " " + str(ord(c))
                    db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True)
                    cursor = db.cursor()
                    #--DONE--> if chat_message['message'][:len("$echo ")] == "$echo ":
                         techo = chat_message['message'][len("!echo "):]
                         twho = techo.split(" ")[0]
                         tmsg = techo.split(" ")[1]
                         chatstream.send_direct_message("%s<||>%s" % (twho,tmsg))
                    #--DONE--> elif chat_message['message'][:len("$help")] == "$help": # user sends $help command, this checks if first 5 chars = '$help'
                         #--DONE--> hmsg = ("$reg - get a BITCORN wallet address :: ")
                         #--DONE--> hmsg += ("$tipcorn <amount> <username>:: ")
                         #--DONE--> hmsg += ("$bitcorn - view your BITCORN Balance :: ")
                         #--DONE--> hmsg += ("$caddy - view your BITCORN Address :: ")
                         hmsg += ("$idle - view your total accumulated time connected to the stream and persistence score :: ")
                         hmsg += ("$rain <amount> <1-5> - Rain a certain Amount to the last 1-5 of People who were active :: ")
                         hmsg += ("$mninfo - view BITCORN MN/COIN Information :: ")
                         hmsg += ("$withdraw <amount> <address> - Withraw your funds off the bot :: Commands do not work in Direct Messages :: ")
                         #--DONE--> hmsg += ("$token - receive a Token to log in to our Bot's API")  # hmsg is the string it makes
#                         hmsg += ("Follow @bitcornhub to receive Whispers from the Bot - https://www.twitch.tv/bitcornhub")
#                         hmsg += ("!discord - view the invite to our Discord Server")
                         chatstream.send_direct_message("%s<||>%s" % (chat_message['username'],hmsg)) # chatsttream.send_direct_messages sends messages through DM
                         SQL = ("SELECT * FROM staff WHERE twitch_username LIKE '%s'" % chat_message['username']) # SQL query to see if user is a staff member
                         cursor.execute(SQL)
                         results = cursor.fetchall()
                         rcount = cursor.rowcount
                         if rcount != 0:
                            hmsg = "The following are Staff only commands and are only visble to Staff :: "
                            #--DONE--> hmsg += "$addstaff <twitch_username> - adds a staff member for staff-only commands and back-end api :: "
                            hmsg += "$start2h - starts the 2 hour happy hour - subs tier 1 earn 60 CORN if are idle in stream for the next 2 hours :: "
                            hmsg += "$start4h - starts the 4 hour happy hour - subs tier 2 earn 120 CORN if are idle in stream for the next 4 hours :: " # creates new string for staff members to see
#                            hmsg += "$idleon - (on by default) turns on idle-timer and tracks how long each subscriber is present/idle in stream :: "
#                            hmsg += "$idleoff - stops the idle-timer that tracks how long each subscriber has been present/idle in stream"
                            chatstream.send_direct_message("%s<||>%s" % (chat_message['username'],hmsg)) # sends message
                    #--DONE--> elif chat_message['message'][:len("$reg")] == "$reg":
#                         await register(chat_message['username'])
                         bot.bg_task = bot.loop.create_task(bot.register(chat_message['username']))
                    #--DONE--> elif chat_message['message'][:len("$token")] == "$token":
                         newToken = ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits + string.ascii_lowercase) for _ in range(32))
                         SQL = ("UPDATE users SET token = '%s' WHERE twitch_username LIKE '%s'" % (newToken,chat_message['username']))
                         cursor.execute(SQL)
                         db.commit()
                         chatstream.send_direct_message("%s<||>Your Token is '%s' (no ' ' quotes) - Use this to login here: https://dashboard.bitcorntimes.com/ - If you use $token again you will receive a new token your old token will be deleted. " % (chat_message['username'],newToken))
                    elif chat_message['message'][:len("$idleon")] == "$idleon":
                         SQL = ("SELECT * FROM staff WHERE twitch_username LIKE '%s'" % chat_message['username'])
                         cursor.execute(SQL)
                         results = cursor.fetchall()
                         rcount = cursor.rowcount
                         if rcount != 0:
                            idleON = 1
                            chatstream.send_direct_message("%s<||>Turned Idle-Timer On, Subscribers Tier 3 Will Receive Hourly Rewards" % (chat_message['username']))
                         else:
                            chatstream.send_chat_message("@%s , You need to be Staff to execute this command!" % (chat_message['username']))
                    elif chat_message['message'][:len("$idleon")] == "$idleoff":
                         SQL = ("SELECT * FROM staff WHERE twitch_username LIKE '%s'" % chat_message['username'])
                         cursor.execute(SQL)
                         results = cursor.fetchall()
                         rcount = cursor.rowcount
                         if rcount != 0:
                                 idleON = 0
                            chatstream.send_direct_message("%s<||>Turned Idle-Timer Off, Subscribers Tier 3 Will Not Receive Hourly Rewards" % (chat_message['username']))
                         else:
                            chatstream.send_chat_message("%s, You need to be Staff to execute this command!" % (chat_message['username']))
                    #--DONE--> elif chat_message['message'][:len("$removestaff")] == "$removestaff":
                         SQL = ("SELECT * FROM staff WHERE twitch_username LIKE '%s'" % chat_message['username'])
                         cursor.execute(SQL)
                         results = cursor.fetchall()
                         rcount = cursor.rowcount
                         if rcount != 0:
                            who = chat_message['message'][len("$removestaff"):]
                            who = who.replace(" ","").replace("<","").replace("@","").replace(">","").replace("'","")
                            SQL = ("SELECT * FROM staff WHERE twitch_username LIKE '%s'" % who)
                            cursor.execute(SQL)
                            results = cursor.fetchall()
                            rcount = cursor.rowcount
                            if rcount == 0:
                               SQL = ("DELETE FROM staff WHERE twitch_username LIKE '%s'" % (who))
                               cursor.execute(SQL)
                               db.commit()
                               SQL = ("UPDATE users SET level='1000' WHERE twitch_username LIKE '%s'" % (who))
                               cursor.execute(SQL)
                               db.commit()
                               chatstream.send_direct_message("%s<||>, You have removed %s as a staff member" % (chat_message['username'], who))
                         else:
                            chatstream.send_chat_message("@%s , You need to be Staff to execute this command!" % (chat_message['username']))
                    #--DONE--> elif chat_message['message'][:len("$addstaff")] == "$addstaff":
                         SQL = ("SELECT * FROM staff WHERE twitch_username LIKE '%s'" % chat_message['username'])
                         cursor.execute(SQL)
                         results = cursor.fetchall()
                         rcount = cursor.rowcount
                         if rcount != 0:
                            who = chat_message['message'][len("$addstaff"):]
                            who = who.replace(" ","").replace("<","").replace("@","").replace(">","").replace("'","")
                            SQL = ("SELECT * FROM staff WHERE twitch_username LIKE '%s'" % who)
                            cursor.execute(SQL)
                            results = cursor.fetchall()
                            rcount = cursor.rowcount
                            if rcount == 0:
                               SQL = ("INSERT INTO staff (id,twitch_username,level) VALUES (NULL,'%s','1')" % (who))
                               cursor.execute(SQL)
                               db.commit()
                               SQL = ("UPDATE users SET level='5000' WHERE twitch_username LIKE '%s'" % (who))
                               cursor.execute(SQL)
                               db.commit()
                               chatstream.send_direct_message("%s<||>, You have added %s as a staff member" % (chat_message['username'], who))
                         else:
                            chatstream.send_chat_message("@%s , You need to be Staff to execute this command!" % (chat_message['username']))
                    elif chat_message['message'][:len("$start2h")] == "$start2h":
                         SQL = ("SELECT * FROM staff WHERE twitch_username LIKE '%s'" % chat_message['username'])
                         cursor.execute(SQL)
                         results = cursor.fetchall()
                         rcount = cursor.rowcount
                         if rcount != 0:
                            timestart2h = td
                            timestart2hdate = td.split(" ")[0]
                            tmpstop = td.split(" ")[1]
                            tmpstophr = tmpstop.split(":")[0]
                            tmpstopmin = tmpstop.split(":")[1]
                            tmpstopsec = tmpstop.split(":")[2]
                            tmpstophr = int(tmpstophr) + 2
                            if int(tmpstophr) <= 9:
                               tmpstophr = "0%s" % str(tmpstophr)
                            else:
                               tmpstophr = "%s" % str(tmpstophr)
                            tsp = "%s %s:%s:%s" % (timestart2hdate,tmpstophr,tmpstopmin,tmpstopsec)
                            SQL = ("INSERT INTO happyhour (id,timestart,timestop,is_active,type) VALUES (NULL,'%s','%s','1','2')" % (timestart2h,tsp))
                            cursor.execute(SQL)
                            db.commit()
                            chatstream.send_chat_message("@%s , 2 Hour Happy Hour has started for Tier 1 Subscribers! 30 CORN/Hour earned! Time Start: %s UTC | Time Stop: %s UTC" % (chat_message['username'],timestart2h,tsp))
                         else:
                            chatstream.send_chat_message("@%s , You need to be Staff to execute this command!" % (chat_message['username']))
                     
                         SQL = ("SELECT * FROM idlers WHERE twitch_username LIKE '%s'" % (chat_message['username']))
                         cursor.execute(SQL)
                         results = cursor.fetchall()
                         rcount = cursor.rowcount
                         if rcount != 0:
                            for row in results:
                                seconds = row[2]
                                minutes = int(seconds) / 60
                                hours = minutes / 60
                                days = hours / 24
                                chatstream.send_direct_message("%s<||>You have accumulated a total of %s seconds, which is a total of %.2f days, or a total of %.2f hours, or a total of %.2f minutes." % (chat_message['username'],seconds,float(days),float(hours),float(minutes)))
                    #--DONE--> elif chat_message['message'][:len("$bitcorn")] == "$bitcorn":
#                         await twbal(chat_message['username'])
                         bot.bg_task = bot.loop.create_task(bot.twbal(chat_message['username']))
                    #--DONE--> elif chat_message['message'][:len("$caddy")] == "$caddy":
#                         await twgetaddy(chat_message['username'])
                         bot.bg_task = bot.loop.create_task(bot.twgetaddy(chat_message['username']))
                    elif chat_message['message'][:len("$rain")] == "$rain": 
                         dTalk = 0
                         argz = "%s" % chat_message['message'][len("$rain "):]
                         try:
                            mam = argz.split(" ")[0]
                            mtu = argz.split(" ")[1]
                            mtu = mtu.replace("@","").replace("<","").replace(">","")
                            if "-" in mam:
                               chatstream.send_chat_message("@%s, Cannot Rain Negative Amount" % (chat_message['username']))
                               dTalk = 1
                            else:
#                               await twrain("%.8f" % (float(mam)), chat_message['username'], mtu)
                               if int(mtu) <= 5:
                                  bot.bg_task = bot.loop.create_task(bot.twrain("%.8f" % (float(mam)),chat_message['username'], mtu)) # calls rain 
                               else:
                                  chatstream.send_chat_message("@%s, Max number of people you can rain to is 5" % (chat_message['username']))
                         except Exception as e:
                            print("RAIN ERROR: %s" % (e))
                    #--DONE--> elif chat_message['message'][:len("$tipcorn")] == "$tipcorn":
                         dTalk = 0
                         argz = "%s" % chat_message['message'][len("$tipcorn "):]
                         try:
                            mam = argz.split(" ")[0]
                            mtu = argz.split(" ")[1]
                            mtu = mtu.replace("@","")
                            if "-" in mam:
                               chatstream.send_chat_message("@%s, Cannot Tip Negative Amount" % (chat_message['username']))
                               dTalk = 1
                            else:
#                               await twtip("%.8f" % (float(mam)), chat_message['username'], mtu)
                               chatstream.send_chat_message("Tipping %s %.8f CORN..." % (mtu,float(mam)))
                               bot.bg_task = bot.loop.create_task(bot.twtip("%.8f" % (float(mam)), chat_message['username'], mtu))
                         except Exception as e:
                            print("TIP ERROR: %s" % (e))
                            chatstream.send_chat_message("There was an error processing your command, please check your syntax and try again. (Example: $tipcorn 10 username420 )")
                    elif chat_message['message'][:len("$withdraw")] == "$withdraw":
                         dTalk = 0
                         argz = "%s" % chat_message['message'][len("$withdraw "):]
                         try:
                            mam = argz.split(" ")[0]
                            madd = argz.split(" ")[1]
                            if "-" in mam:
                               chatstream.send_chat_message("@%s, Cannot Withdraw Negative Amount" % (chat_message['username']))
                               dTalk = 1
                            else:
#                               await twwithdraw("%.8f" % (float(mam)), madd, chat_message['username'])
                               bot.bg_task = bot.loop.create_task(bot.twwithdraw("%.8f" % (float(mam)), madd, chat_message['username']))
                               chatstream.send_chat_message("Withdrawing %.8f CORN -> %s..." % (float(mam),madd))
                         except Exception as e:
                            chatstream.send_chat_message("There was an error processing your command, please check your syntax and try again. (Example: $withdraw 10 CPQk6nz3btyxWPYBGVGUcgimkMqJwpPTqU )")
                    db.close()
             await asyncio.sleep(1)
             count += 1
           else:
              chatstream.Break
              bot.bg_task = bot.loop.create_task(bot.twitch("irc_channel","bot_username","irc_oauth:jsjsjsjdfj_example_gkgkgkg"))
    except Exception as e:
         await logit("Auto.Twitch","Error: %s" % (e))
#         bot.bg_task = bot.loop.create_task(bot.twitch("irc_channel","bot_username","irc_oauth:jsjsjsjdfj_example_gkgkgkg"))

@bot.event # rain
async def twrain(camount: str=None, fromname: str=None, pcount: str=None):
   global dtx
   global dTalk
   if camount is not None and fromname is not None and pcount is not None:
      db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True) # db info
      cursor = db.cursor()
      camount = camount.replace("'","").replace("<","").replace(">","")
      pcount = pcount.replace("'","").replace("<","").replace(">","") # clean string to prevent sql injections
      fdid = None
      ftwun = None
      fcaddy = None
      fcbalance = None
      SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (fromname)) # sql query to get user
      cursor.execute(SQL)
      results = cursor.fetchall()
      rcount = cursor.rowcount
      if rcount != 0:
         for row in results:
             fdid = row[1] 
             ftwun = row[2]
             fcaddy = row[3]
             fcbalance = row[4]     # info from DB
         fcbalance = "%.8f" % float(fcbalance)
         camount = "%.8f" % float(camount)
         if float(camount) < float(fcbalance):
            rainamount = float(camount) / float(pcount)
            rastr = "%.8f" % float(rainamount)
            dtx.append("CornBot<||>Raining %.8f $BITCORN to the last %s active chatters!" % (float(rainamount),pcount))
            lastactive = []
#            safecounter = (int(pcount) + (int(pcount)/2))
            SQL = ("SELECT * FROM activitytracking WHERE channel LIKE 'irc_channel' ORDER BY id DESC")  # gets last active users
            cursor.execute(SQL)
            results = cursor.fetchall()
            rcount = cursor.rowcount
            if rcount != 0:
               tmpcount = 0
               for row in results:
                   if tmpcount < int(pcount):
                      if row[1] not in lastactive:
                         if "nightbot" not in row[1].lower() and "cttvbotcorn" not in row[1].lower() and "bitcornhub" not in row[1].lower() and "stay_hydrated_bot" not in row[1].lower() and fromname not in row[1].lower() and "bitcornhub" not in row[1].lower(): # stops certain users from rain
                            lastactive.append(row[1]) # appends last active users
                            tmpcount += 1
               sentTo = []
               for item in lastactive:
                   await twdorain(rastr,fromname,item) # calls to make rain happen
                   dTalk = 0
#                   bot.bg_task = bot.loop.create_task(bot.twdorain(rastr,fromname,item))
                   sentTo.append(item)
               whoswet = ', '.join(sentTo)
               dtx.append("%s<|DM|> Rained on: %s" % (fromname,whoswet[:499]))
            await logit("Rain.Execute","Raining by %s" % (fromname))
         else:
            dtx.append("%s<|DM|>You do not have enough in your balance! (%.8f CORN)" % (fromname, float(fcbalance)))
            await logit("Rain.Execute","%s Tried Raining but does not have enough funds! (%.8f CORN) " % (fromname,float(fcbalance)))
      else:
         dtx.append("CornBot<||>@%s You need to register and deposit / earn BITCORN in order to make it rain!" % (fromname))
         await logit("Rain.Execute","%s is not Registered, No Bal, Cannot Rain" % (fromname))
      db.close()
   else:
     dtx.append("CornBot<||>@%s Invalid Syntax! Usage: $rain <amount> <number of people> :: (Rain Example: $rain 10 10 )[This rains 1 coin to the last 10 active people in chat]")
     await logit("Rain.Execute","Raining by %s" % (fromname))
   dTalk = 1


@bot.event
async def mninfo():
   global dtx
   try:
         url = ("https://explorer.bitcorntimes.com/roi")
         opener = AppURLopener()
         response = opener.open(url)
         tmp = response.read().decode('utf-8').replace(" ","")
#         print(tmp)
         btcprice = tmp.split('<b>BTCPrice[USD]</b>\n</div>\n<divclass="cell">\n')[1]
         btcprice = btcprice.split("</b>\n</div>")[0]
         pricebtc = tmp.split('<b>Price[BTC]</b>\n</div>\n<divclass="cell">\n')[1]
         pricebtc = pricebtc.split("</div>\n</div>")[0]
         priceusd = tmp.split('<b>Price[USD]</b>\n</div>\n<divclass="cell">\n')[1]
         priceusd = priceusd.split("</div>\n</div>")[0]
         mkcap = tmp.split('<b>MarketCap[USD]</b>\n</div>\n<divclass="cell">\n')[1]
         mkcap = mkcap.split("</div>\n</div>")[0]
         collat = tmp.split('<b>Collateral</b>\n</div>\n<divclass="cell">\n')[1]
         collat = collat.split("</div>\n</div>")[0]
         mnonline = tmp.split('<b>MNOnline</b>\n</div>\n<divclass="cell">\n')[1]
         mnonline = mnonline.split("</div>\n</div>")[0]
         clock = tmp.split('<b>CoinsLocked</b>\n</div>\n<divclass="cell">\n')[1]
         clock = clock.split("</div>\n</div>")[0]
         inves = tmp.split('<b>Investment</b>\n</div>\n<divclass="cell">\n')[1]
         inves = inves.split("</div>\n</div>")[0]
         mnday = tmp.split('<b>MNReward/Day</b>\n</div>\n<divclass="cell">\n')[1]
         mnday = mnday.split("</div>\n</div>")[0]
         incday = tmp.split('<b>Income/Day</b>\n</div>\n<divclass="cell">\n')[1]
         incday = incday.split("</div>\n</div>")[0]
         incwk = tmp.split('<b>Income/Week</b>\n</div>\n<divclass="cell">\n')[1]
         incwk = incwk.split("</div>\n</div>")[0]
         incmo = tmp.split('<b>Income/Month</b>\n</div>\n<divclass="cell">\n')[1]
         incmo = incmo.split("</div>\n</div>")[0]
         incyr = tmp.split('<b>Income/Year</b>\n</div>\n<divclass="cell">\n')[1]
         incyr = incyr.split("</div>\n</div>")[0]
         roiday = tmp.split('<b>ROI/Day</b>\n</div>\n<divclass="cell">\n')[1]
         roiday = roiday.split("</div>\n</div>")[0]
         roiwk = tmp.split('<b>ROI/Week</b>\n</div>\n<divclass="cell">\n')[1]
         roiwk = roiwk.split("</div>\n</div>")[0]
         roimo = tmp.split('<b>ROI/Month</b>\n</div>\n<divclass="cell">\n')[1]
         roimo = roimo.split("</div>\n</div>")[0]
         roiyr = tmp.split('<b>ROI/Year</b>\n</div>\n<divclass="cell">\n')[1]
         roiyr = roiyr.split("</div>\n</div>")[0]
         roireach = tmp.split('<b>ROIReached</b>\n</div>\n<divclass="cell">\n')[1]
         roireach = roireach.split("</div>\n")[0]
#         print(pricebtc,btcprice,priceusd,mkcap,collat,mnonline,clock,inves,mnday,incday,incwk,incmo,incyr,roiday,roiwk,roimo,roiyr,roireach)
         msg = "Price BTC: %s :: " % pricebtc
         msg += "BTC PRICE: %s :: " % btcprice
         msg += "USD PRICE: %s :: " % priceusd
         msg += "Market Cap: %s :: " % mkcap
         msg += "Collateral: %s :: " % collat
         msg += "MN Online: %s :: " % mnonline
         msg += "Coins Locked: %s :: " % clock
         msg += "Investment: %s :: " % inves
         msg += "MN Rewards / Day: %s :: " % mnday
         msg += "Income / Day: %s :: " % incday
         msg += "Income / Week: %s :: " % incwk
         msg += "Income / Month: %s :: " % incmo
         msg += "Income / Year: %s :: " % incyr
         msg += "ROI / Day: %s :: " % roiday
         msg += "ROI / Week: %s :: " % roiwk
         msg += "ROI / Month: %s :: " % roimo
         msg += "ROI Year: %s :: " % roiyr
         msg += "ROI Reached: %s" % roireach
         dtx.append("CB<||>%s" % msg)
   except Exception as e:
     print("MNINFO ERROR: %s" % e)
     pass

@bot.event
async def twgetaddy(fromname: str=None):
   global dtx
   if fromname is not None:
      fromname = fromname.replace("'","").replace("<","").replace("@","").replace("!","").replace(">","")
      db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True)
      cursor = db.cursor()
      SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (fromname))
      cursor.execute(SQL)
      results = cursor.fetchall()
      rcount = cursor.rowcount
      if rcount == 0:
         aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
         headers = {'content-type': 'application/json'}
         payload = {
                 "method": "getnewaddress",
                 "params": ["{}".format(fromname)],
         }
         response = requests.post(
                aurl, data=json.dumps(payload), headers=headers).json()
         dcaddy = response["result"].replace('"','').replace("'","")
         SQL = ("INSERT INTO users (id,discordid,twitch_username,cornaddy,balance,token,level,avatar) VALUES (NULL,'NA','%s','%s','0.0','NA','1000','NA')" % (fromname,dcaddy))
         cursor.execute(SQL)
         db.commit()
         dtx.append("CornBot<||> @%s, Your BITCORN Address is %s" % (fromname, dcaddy))
      SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (fromname))
      cursor.execute(SQL)
      results = cursor.fetchall()
      rcount = cursor.rowcount
      if rcount != 0:
         fcaddy = None
         for row in results:
             fdid = row[1]
             ftwun = row[2]
             fcaddy = row[3]
             fcbalance = row[4]
         dtx.append("%s<|DM|>Your Twitch BITCORN Address is: %s" % (fromname, fcaddy))
      await logit("Address Request","Request by %s" % (fromname))
      db.close()

@bot.event
async def twwithdraw(camount: str=None, waddy: str=None, fromname: str=None):
   global dtx
   global dTalk
   if camount is not None and fromname is not None and waddy is not None:
      fromname = fromname.replace("'","").replace("<","").replace("@","").replace("!","").replace(">","")
      camount = camount.replace("'","").replace("<","").replace(">","")
      db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True)
      cursor = db.cursor()
      SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (fromname))
      cursor.execute(SQL)
      results = cursor.fetchall()
      rcount = cursor.rowcount
      fromcaddy = ''
      fromcbalance = 0.0
      fcaddy = ''
      f_isdis = 0
      t_isdis = 0
      tdid = None
      fdid = None
      if rcount == 0:
         aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
         headers = {'content-type': 'application/json'}
         payload = {
                 "method": "getnewaddress",
                 "params": ["{}".format(fromname)],
         }
         response = requests.post(
                aurl, data=json.dumps(payload), headers=headers).json()
         dcaddy = response["result"].replace('"','').replace("'","")
         SQL = ("INSERT INTO users (id,discordid,twitch_username,cornaddy,balance,token,level,avatar) VALUES (NULL,'NA','%s','%s','0.0','NA','1000','NA')" % (fromname,dcaddy))
         cursor.execute(SQL)
         db.commit()
         dtx.append("CornBot<||> @%s, Your BITCORN Address is %s" % (fromname, dcaddy))
      SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (fromname))
      cursor.execute(SQL)
      results = cursor.fetchall()
      rcount = cursor.rowcount
      if rcount != 0:
            fcabalance = None
            for row in results:
                fdid = row[1]
                ftwun = row[2]
                fcaddy = row[3]
                fcbalance = row[4]
            fromcbalance = "%.8f" % float(fcbalance)
            camount = "%.8f" % float(camount)
            if float(camount) < float(fromcbalance):
               aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
               headers = {'content-type': 'application/json'}
               payload = {
                       "method": "sendtoaddress",
                       "params": [waddy,float(camount),"%s Withdrew To %s" % (fromname,waddy)]
               }
               response = None
               async with aiohttp.ClientSession() as session:
                    async with session.post(aurl, headers=headers,json=payload) as resp:
                               response = await resp.json()
                               await session.close()
#               response = requests.post(
#                   aurl, data=json.dumps(payload), headers=headers).json()
               fromfinalbal = float(fromcbalance) - float(camount)
#               print(response['result'])
               SQL = ("UPDATE users SET balance = '%.8f' WHERE twitch_username LIKE '%s'" % (float(fromfinalbal),fromname))
               cursor.execute(SQL)
               db.commit()
               now = datetime.datetime.now()
               td = (now.strftime("%m-%d-%Y %H:%M:%S"))
               dtx.append("%s<|DM|>Recent TX: https://explorer.bitcorntimes.com/tx/%s" % (fromname, response['result'].replace('"','')))
               SQL = ("INSERT INTO txtracking (id,account,amount,txid,address,confirmations,category,timereceived,comment) VALUES (NULL,'%s','%.8f','%s','%s','%s','%s','%s','Withdraw')" % (fromname,float(camount),response['result'].replace('"',''),waddy,'0','send',td))
               cursor.execute(SQL)
               db.commit()
            else:
               dtx.append("%s<|DM|>You do not have enough funds! (%.8f CORN) (Roughly .001 TX Fee)" % (fromname,float(fromcbalance)))
            await logit("Withdraw Request","Request by %s" % (fromname))
      db.close()
      dTalk = 1

#@bot.event
async def twdorain(camount: str=None, fromname: str=None, toname: str=None):
   global dtx
   global tfileq
   global dTalk
   if camount is not None and fromname is not None and toname is not None:
      toname = toname.replace("'","").replace("<","").replace("@","").replace("!","").replace(">","")
      fromname = fromname.replace("'","").replace("<","").replace("@","").replace("!","").replace(">","")
      camount = camount.replace("'","").replace("<","").replace(">","")
      db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True)
      cursor = db.cursor()
      SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (fromname)) # get the user
      cursor.execute(SQL)
      results = cursor.fetchall()
      rcount = cursor.rowcount
      fromcaddy = ''
      fromcbalance = 0.0
      tocaddy = ''
      tocbalance = 0.0
      f_isdis = 0
      t_isdis = 0
      tdid = None
      fdid = None
      if rcount != 0:
         for row in results:
             fdid = row[1]
             ftwun = row[2]
             fromcaddy = row[3]
             fromcbalance = row[4] # get their balance 
         SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (toname)) # get the person getting rained on
         cursor.execute(SQL)
         results = cursor.fetchall()
         rcount = cursor.rowcount
         if rcount == 0: # if they dont have an account / address, create one
               aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"  # RPC INFO - bitcornwallet
               headers = {'content-type': 'application/json'}
               payload = {
                       "method": "getnewaddress",
                       "params": ["{}".format(toname)],
               }
               response = requests.post(
                      aurl, data=json.dumps(payload), headers=headers).json()
               dcaddy = response["result"].replace('"','').replace("'","") # response and cleaning the string
               SQL = ("INSERT INTO users (id,discordid,twitch_username,cornaddy,balance,token,level,avatar) VALUES (NULL,'NA','%s','%s','0.0','NA','1000','NA')" % (toname,dcaddy)) # new entry for user 
               cursor.execute(SQL)
               db.commit()
#               dtx.append("CornBot<||> @%s, Your BITCORN Address is %s" % (toname, dcaddy))
         SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (toname)) # user exists now, start send process
         cursor.execute(SQL)
         results = cursor.fetchall()
         rcount = cursor.rowcount
         if rcount != 0:
            for row in results:
                tdid = row[1]
                ttwun = row[2]
                tocaddy = row[3]
                tocbalance = row[4]
            fromcbalance = "%.8f" % float(fromcbalance)
            tocbalance = "%.8f" % float(tocbalance)
            camount = "%.8f" % float(camount)
            if float(camount) < float(fromcbalance):
               aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
               headers = {'content-type': 'application/json'}
               payload = {
                       "method": "sendtoaddress",
                       "params": [tocaddy,float(camount),"%s Rained %s" % (fromname,toname)] # sends the rain amount to user
               }
               response = None
               async with aiohttp.ClientSession() as session:
                     async with session.post(aurl, headers=headers,json=payload) as resp:
                           response = await resp.json()
                           await session.close()
 #              response = requests.post(
  #                 aurl, data=json.dumps(payload), headers=headers).json()
               fromfinalbal = float(fromcbalance) - float(camount)
               tofinalbal = float(camount) + float(tocbalance)       #update balances for the from user and to user
#               SQL = ("UPDATE users SET balance = '%.8f' WHERE cornaddy LIKE '%s'" % (float(tofinalbal),tocaddy))
#               cursor.execute(SQL)
#               db.commit()
               SQL = ("UPDATE users SET balance = '%.8f' WHERE cornaddy LIKE '%s'" % (float(fromfinalbal),fromcaddy)) # update for from user
               cursor.execute(SQL)
               db.commit()
               txid = json.dumps(response["result"])
               now = datetime.datetime.now()
               td = (now.strftime("%m-%d-%Y %H:%M:%S"))
               SQL = ("INSERT INTO txtracking (id,account,amount,txid,address,confirmations,category,timereceived,comment) VALUES (NULL,'%s','%.8f','%s','%s','%s','%s','%s','Rain')" % (fromname,float(camount),txid.replace('"',''),fromcaddy,'0','send',td)) # add to txtracking
               cursor.execute(SQL)
               db.commit()
#               top = "<head>\n<title>%s's Receipts</title>\n<style type=\"text/css\">\nbody,td,th {\n    color: \#FFF;\n}\n</style>\n</head>" % fromname
#               top += "<body bgcolor=\"#000000\">\n"
#               receipt = "<blockquote><br />"
#               receipt += "[BITCORN TRANSACTION]<br />\nYour Address: %s <br />\n%s's Address: %s<br />\nAmount Transacted: %.8f CORN<br />\nTransaction ID: %s<br />\nExplorer: https://explorer.bitcorntimes.com/tx/%s<br />\n" % (fromcaddy,toname,tocaddy,float(camount),txid.replace('"',''),txid.replace('"',''))
#               receipt += "</blockquote>\n"
#               bottom = "</body>\n</html>"
#               the_file = Path("/root/%s.html" % (fromname))
#               if the_file.is_file():
#                  with open('%s.html' % (fromname)) as f:
#                       newText=f.read().replace(bottom, "")
#                       newText += receipt
#                       newText += bottom
#                  with open('%s.html' % (fromname), "w") as f:
#                       f.write(newText)
#                  tfileq.append(fromname)
##               else:
#                  newText = top
#                  newText += receipt
#                  newText += bottom
#                  with open('%s.html' % (fromname), "w") as f:
#                       f.write(newText)
#                  tfileq.append(fromname)
            else:
               dtx.append("%s<|DM|>Insufficient Funds, Cannot Tip (Check Balance with: $bitcorn )" % (fromname))
      db.close()

@bot.event
async def twtip(camount: str=None, fromname: str=None, toname: str=None):
   global dtx
   global dTalk
   if camount is not None and fromname is not None and toname is not None:
      toname = toname.replace("'","").replace("<","").replace("@","").replace("!","").replace(">","")
      fromname = fromname.replace("'","").replace("<","").replace("@","").replace("!","").replace(">","")
      camount = camount.replace("'","").replace("<","").replace(">","")
      db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True)
      cursor = db.cursor()
      SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (fromname))
      cursor.execute(SQL)
      results = cursor.fetchall()
      rcount = cursor.rowcount
      fromcaddy = ''
      fromcbalance = 0.0
      tocaddy = ''
      tocbalance = 0.0
      f_isdis = 0
      t_isdis = 0
      tdid = None
      fdid = None
      if rcount != 0:
         for row in results:
             fdid = row[1]
             ftwun = row[2]
             fromcaddy = row[3]
             fromcbalance = row[4]
         SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (toname))
         cursor.execute(SQL)
         results = cursor.fetchall()
         rcount = cursor.rowcount
         if rcount == 0:
               aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
               headers = {'content-type': 'application/json'}
               payload = {
                       "method": "getnewaddress",
                       "params": ["{}".format(toname)],
               }
               response = requests.post(
                      aurl, data=json.dumps(payload), headers=headers).json()
               dcaddy = response["result"].replace('"','').replace("'","")
               SQL = ("INSERT INTO users (id,discordid,twitch_username,cornaddy,balance,token,level,avatar) VALUES (NULL,'NA','%s','%s','0.0','NA','1000','NA')" % (toname,dcaddy))
               cursor.execute(SQL)
               db.commit()
#               dtx.append("CornBot<||> @%s, Your BITCORN Address is %s" % (toname, dcaddy))
         SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (toname))
         cursor.execute(SQL)
         results = cursor.fetchall()
         rcount = cursor.rowcount
         if rcount != 0:
            for row in results:
                tdid = row[1]
                ttwun = row[2]
                tocaddy = row[3]
                tocbalance = row[4]
            fromcbalance = "%.8f" % float(fromcbalance)
            tocbalance = "%.8f" % float(tocbalance)
            camount = "%.8f" % float(camount)
            if float(camount) < float(fromcbalance):
               aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
               headers = {'content-type': 'application/json'}
               payload = {
                       "method": "sendtoaddress",
                       "params": [tocaddy,float(camount),"%s Tipped %s" % (fromname,toname)]
               }
               response = None
               async with aiohttp.ClientSession() as session:
                     async with session.post(aurl, headers=headers,json=payload) as resp:
                           response = await resp.json()
                           await session.close()
#               response = requests.post(
#                   aurl, data=json.dumps(payload), headers=headers).json()
               fromfinalbal = float(fromcbalance) - float(camount)
               tofinalbal = float(camount) + float(tocbalance)
#               SQL = ("UPDATE users SET balance = '%.8f' WHERE cornaddy LIKE '%s'" % (float(tofinalbal),tocaddy))
#               cursor.execute(SQL)
#               db.commit()
               SQL = ("UPDATE users SET balance = '%.8f' WHERE cornaddy LIKE '%s'" % (float(fromfinalbal),fromcaddy))
               cursor.execute(SQL)
               db.commit()
               txid = json.dumps(response["result"])
               now = datetime.datetime.now()
               td = (now.strftime("%m-%d-%Y %H:%M:%S"))
               SQL = ("INSERT INTO txtracking (id,account,amount,txid,address,confirmations,category,timereceived,comment) VALUES (NULL,'%s','%.8f','%s','%s','%s','%s','%s','Tip')" % (fromname,float(camount),txid.replace('"',''),fromcaddy,'0','send',td))
               cursor.execute(SQL)
               db.commit()
               dtx.append("%s<|DM|>Here is your tip receipt: [BITCORN TRANSACTION] :: Your Address: %s :: %s's Address: %s :: Amount Transacted: %.8f CORN :: Transaction ID: %s :: Explorer: https://explorer.bitcorntimes.com/tx/%s" % (fromname,fromcaddy,toname,tocaddy,float(camount),txid.replace('"',''),txid.replace('"','')))
            else:
               dtx.append("%s<|DM|>Insufficient Funds, Cannot Tip (Check Balance with: $bitcorn )" % (fromname))
            await logit("Tip Executed","Executed by %s" % (fromname))
      db.close()
      dTalk = 1

@bot.event
async def register(uname):
      uname = uname.replace("'","")
      db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True)
      cursor = db.cursor()
      SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (uname))
      cursor.execute(SQL)
      results = cursor.fetchall()
      rcount = cursor.rowcount
      if rcount == 0:
         aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
         headers = {'content-type': 'application/json'}
         payload = {
                 "method": "getnewaddress",
                 "params": ["{}".format(uname)],
         }
         response = requests.post(
                aurl, data=json.dumps(payload), headers=headers).json()
         caddy = response["result"].replace('"','').replace("'","")
         SQL = ("INSERT INTO users (id,discordid,twitch_username,cornaddy,balance,token,level,avatar) VALUES (NULL,'NA','%s','%s','0.0','NA','1000','NA')" % (uname,caddy))
         cursor.execute(SQL)
         db.commit()
         dtx.append("CornBot<||> @%s, Your BITCORN Address is %s" % (uname, caddy))
         await logit("Registered: Address","Request by %s" % (uname))
      else:
         SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (uname))
         cursor.execute(SQL)
         results = cursor.fetchall()
         rcount = cursor.rowcount
         tcaddy = None
         for row in results:
             tdid = row[1]
             tun = row[2]
             tcaddy = row[3]
             tbalance = row[4]
         dtx.append("CornBot<||>@%s, Your BITCORN Address is %s" % (uname, tcaddy))
         await logit("Address Request","Request by %s" % (uname))
      db.close()

@bot.event
async def twbal(uname): # $bitcorn - get user balance
      global dTalk
      global dtx
      uname = uname.replace("'","")
      db = MySQLdb.connect(host="localhost",user="root",passwd="user_password",db="database_name",use_unicode=True)
      cursor = db.cursor()
      SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (uname))
      cursor.execute(SQL)
      results = cursor.fetchall()
      rcount = cursor.rowcount
      if rcount == 0: # create user if not found
         aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
         headers = {'content-type': 'application/json'}
         payload = {
                 "method": "getnewaddress",
                 "params": ["{}".format(uname)],
         }
         response = requests.post(
                aurl, data=json.dumps(payload), headers=headers).json()
         caddy = response["result"].replace('"','').replace("'","")
         SQL = ("INSERT INTO users (id,discordid,twitch_username,cornaddy,balance,token,level,avatar) VALUES (NULL,'NA','%s','%s','0.0','NA','1000','NA')" % (uname,caddy))
         cursor.execute(SQL)
         db.commit()
#         dtx.append("CornBot<||> @%s, Your BITCORN Address is %s" % (uname, caddy))
         dtx.append("%s<|DM|>Your BITCORN Balance is %.8f CORN" % (uname, float("0.0")))
         await logit("Balance Request","Request by %s (%.8f CORN)" % (uname,float(0.0)))
      else:
         SQL = ("SELECT * FROM users WHERE twitch_username LIKE '%s'" % (uname))
         cursor.execute(SQL)
         results = cursor.fetchall()
         rcount = cursor.rowcount
         tcaddy = None
         tbalance = None
         for row in results:
             tdid = row[1]
             tun = row[2]
             tcaddy = row[3]
             tbalance = row[4]
         aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
         headers = {'content-type': 'application/json'}
         payload = {
                    "method": "getbalance",
                    "params": ["{}".format(str(uname))],
         }
         response = requests.post(
                aurl, data=json.dumps(payload), headers=headers).json()
         results = json.dumps(response["result"])
#         if float(results) < .001: tbalance = 0.0
         if float(tbalance) > float(0):
#            dtx.append("CornBot<||> @%s , Your BITCORN Address is %s" % (uname, tcaddy))
            dtx.append("%s<|DM|>Your BITCORN Balance is %.8f CORN" % (uname, float(tbalance)))
         await logit("Balance Request","Request by %s (%.8f CORN)" % (uname,float(tbalance)))
      db.close()
      dTalk = 1

def get_headers():
    return {
        'Accept': 'application/vnd.twitchtv.v5+json',
        'Client-ID': 'cp162gtdsoh0ccmg9kr1g36i0ifyq3',
        'Authorization': 'OAuth i9ju7n4nj2lx480atecx1tsagvzhoj',
#        'Access_token': None,
#        'Scope': 'channel_subscriptions'
    }


@bot.command()
async def block(ctx):
      aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
      headers = {'content-type': 'application/json'}
      payload = {
                "method": "getinfo",
 #               "params": ["IBERRY420"],
      }
      response = requests.post(
                 aurl, data=json.dumps(payload), headers=headers).json()
      results4 = response['result']
      tbalance = 0.0
      await ctx.send("Current Block is: `%s`" % (str(results4['blocks'])))

@bot.command()
async def getblock(ctx):
      aurl = "http://wallet_username:wallet_password@wallet_ip_address:wallet_porn/"
      headers = {'content-type': 'application/json'}
      payload = {
                "method": "getinfo",
 #               "params": ["IBERRY420"],
      }
      response = requests.post(
                 aurl, data=json.dumps(payload), headers=headers).json()
      results4 = response['result']
      tbalance = 0.0
      await ctx.send("Current Block is: `%s`" % (str(results4['blocks'])))


loop = asyncio.get_event_loop()
loop.create_task(bot.twitch("irc_channel","bot_username","irc_oauth:jsjsjsjdfj_example_gkgkgkg")) # oauth and irc info
try:
    loop.run_forever()
finally:
    loop.stop()
