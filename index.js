(function ()
{
    'use strict';

    var express = require('express'),
        router = express.Router(),
        Http = require('http'),
        Querystring = require('querystring'),
        Util = require('util'),
        Crypto = require('crypto'),

        reply = function (statusCode, res)
        {
            var message = { message: Http.STATUS_CODES[statusCode].toLowerCase() };
            message.result = statusCode >= 400 ? 'error' : 'ok';
            message = JSON.stringify(message);

            var headers = {
                'Content-Type': 'application/json',
                'Content-Length': message.length
            };

            res.writeHead(statusCode, headers);
            res.end(message);
        },

        parse = function (data)
        {
            var result;
            try
            {
                result = JSON.parse(data);
            }
            catch (e)
            {
                result = false;
            }
            return result;
        };

    module.exports = function (options)
    {
        router.post('/',
                   function (req, res)
                   {
                       var buffer = [];
                       var bufferLength = 0;
                       var isForm = false;
                       var failed = false;
                       var remoteAddress = req.ip || req.socket.remoteAddress || req.socket.socket.remoteAddress;

                       var logger = logger = options.logger || { log: function () {}, error: function () {} };
                       var secret = options.secret || false;
					   var treatRequestFct = options.treatRequest || function (event, repo, ref, data) {
							console.log('WEBHOOK ' + event + ' on repository ' + repo + ', action: ' + data.action);
						};
		

                       req.on('data', function (chunk)
                       {
                           if (failed)
                           {
                               return;
                           }

                           buffer.push(chunk);
                           bufferLength += chunk.length;
                       });

                       req.on('end', function (chunk)
                       {
                           if (failed)
                           {
                               return;
                           }

                           var data;

                           if (chunk)
                           {
                               buffer.push(chunk);
                               bufferLength += chunk.length;
                           }

                           logger.log(Util.format('received %d bytes from %s', bufferLength, remoteAddress));

                           if (req.headers['content-type'] === 'application/x-www-form-urlencoded')
                           {
                               isForm = true;
                               data = Buffer.concat(buffer, bufferLength).toString();
                           }
                           else
                           {
                               //this is already a string when sent as JSON
                               data = Buffer.concat(buffer, bufferLength);
                           }

                           // if a secret is configured, make sure the received signature is correct
                           if (secret)
                           {
                               var signature = req.headers['x-hub-signature'];

                               if (!signature)
                               {
                                   logger.error('secret configured, but missing signature, returning 403');
                                   return reply(403, res);
                               }

                               signature = signature.replace(/^sha1=/, '');
                               var digest = Crypto.createHmac('sha1', secret).update(data).digest('hex');

                               if (signature !== digest)
                               {
                                   logger.error('got invalid signature, returning 403');
                                   return reply(403, res);
                               }
                           }

                           if (isForm)
                           {
                               data = Querystring.parse(data).payload;
                           }
                           data = parse(data);

                           // invalid json
                           if (!data)
                           {
                               logger.error(Util.format('received invalid data from %s, returning 400', remoteAddress));
                               return reply(400, res);
                           }
                           if (!data.repository || !data.repository.name)
                           {
                               logger.error(Util.format('received incomplete data from %s, returning 400', remoteAddress));
                               return reply(400, res);
                           }

                           var event = req.headers['x-github-event'];
                           var repo = data.repository.name;
                           var ref = data.ref;

                           // and now we emit a bunch of data
                           if (ref)
                           {
                               logger.log(Util.format('got %s event on %s:%s from %s', event, repo, ref, remoteAddress));
                           }
                           else
                           {
                               logger.log(Util.format('got %s event on %s from %s', event, repo, remoteAddress));
                           }

                           treatRequestFct(event, repo, ref, data);

                           reply(200, res);
                       });

                       logger.log(Util.format(req.method, req.url, remoteAddress));

                       // 400 if it's not a github event
                       if (!req.headers.hasOwnProperty('x-github-event'))
                       {
                           logger.error(Util.format('missing x-github-event header from %s, returning 400', remoteAddress));
                           failed = true;
                           return reply(400, res);
                       }
                   }
        );

        return router;
    };

})();
