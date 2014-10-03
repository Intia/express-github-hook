express-github-hook
===================

This is a very simple, easy to use evented web hook for github.


To Install:
-----------
```
npm install express-github-hook
```

To Use:
-------

```javascript
var options = {
            secret: 'Your payload secret(optional)',
			
            logger: {
                log: function (msg)
                {
                    console.log('GitHubHook : ' + msg);
                },
                error: function (msg)
                {
                    console.error('GitHubHook : ' + msg);
                    events.send('error', {route: 'githubhook', error: msg});
                }
            },
			
            treatRequest: function (event, repo, ref, data)
            {
                console.log('WEBHOOK ' + event + ' on repository ' + repo + ', action: ' + data.action);

                switch (event)
                {
                    case 'issues':
                        processIssue(repo, ref, data);
                        break;

                    case 'issue_comment':
                        processIssue(repo, ref, data);
                        break;

                    case 'public':
                        processPublic(repo, ref, data);
                        break;
                }
            }
};

app.use('/webhook', require('express-github-hook')(options));
```

Where 'event' is the event name to listen to (sent by github, typically 'push'), 'reponame' is the name of your repo, and 'ref' is the git reference (such as ref/heads/master)

Configure a WebHook URL to whereever the server is listening, with a path of ```/github/callback``` (or ```/github/callback?secret=yoursecret``` if you set a secret) and you're done!

Available options are:

* secret: if specified, you must use the same secret in your webhook configuration in github. if a secret is specified, but one is not configured in github, the hook will fail. if a secret is *not* specified, but one *is* configured in github, the signature will not be validated and will be assumed to be correct. consider yourself warned.
* logger: an optional instance of a logger that supports the "log" and "error" methods and one parameter for data (like console), default is to not log. mostly only for debugging purposes.
* treatRequest: your method who process all webhook requests


Thanks
=======
Thanks to Nathan LaFreniere for its node module: githubhook

License
=======

MIT
