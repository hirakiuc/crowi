/**
 * slack
 */

module.exports = function(crowi) {
  'use strict'

  const SLACK_URL = 'https://slack.com'

  const debug = require('debug')('crowi:util:slack')
  const Config = crowi.model('Config')
  const SlackWebClient = require('@slack/client').WebClient
  const sprintf = require('sprintf')
  const pageEvent = crowi.event('page')
  const slack = {}

  slack.client = undefined

  // get client with access token,
  // if access token is not fetched, return undefiend
  slack.getClient = function() {
    // alreay created
    if (slack.client) {
      return slack.client
    }

    const config = crowi.getConfig()

    let client
    if (Config.hasSlackToken(config)) {
      client = new SlackWebClient(config.notification['slack:token'])
      slack.client = client
    }

    return slack.client
  }

  // this is called to generate redirect_uri
  slack.getSlackAuthCallbackUrl = function() {
    var config = crowi.getConfig()
    // Web アクセスがきてないと app:url がセットされないので crowi.setupSlack 時にはできない
    // cli, bot 系作るときに問題なりそう
    return (config.crowi['app:url'] || '') + '/admin/notification/slackAuth'
  }

  // this is called to get the url for oauth screen
  slack.getAuthorizeURL = function() {
    const config = crowi.getConfig()
    if (Config.hasSlackConfig(config)) {
      const slackClientId = config.notification['slack:clientId']
      const redirectUri = slack.getSlackAuthCallbackUrl()

      return `${SLACK_URL}/oauth/authorize?client_id=${slackClientId}&redirect_uri=${redirectUri}&scope=chat:write:bot`
    } else {
      return ''
    }
  }

  // this is called to get access token with code (oauth process)
  slack.getOauthAccessToken = function(code) {
    const client = new SlackWebClient()

    const config = crowi.getConfig()
    const clientId = config.notification['slack:clientId']
    const clientSecret = config.notification['slack:clientSecret']
    const redirectUri = slack.getSlackAuthCallbackUrl()

    return client.oauth.access(clientId, clientSecret, code, { redirect_uri: redirectUri })
  }

  slack.post = function(channel, message, opts) {
    const client = slack.getClient()

    return new Promise(function(resolve, reject) {
      client.chat.postMessage(channel, message, opts, function(err, res) {
        if (err) {
          debug('Post error', err, res)
          debug('Sent data to slack is:', message)
          return reject(err)
        }

        resolve(res)
      })
    })
  }

  slack.convertMarkdownToMrkdwn = function(body) {
    var config = crowi.getConfig()
    var url = ''
    if (config.crowi && config.crowi['app:url']) {
      url = config.crowi['app:url']
    }

    body = body
      .replace(/\n\*\s(.+)/g, '\n• $1')
      .replace(/#{1,}\s?(.+)/g, '\n*$1*')
      .replace(/(\[(.+)\]\((https?:\/\/.+)\))/g, '<$3|$2>')
      .replace(/(\[(.+)\]\((\/.+)\))/g, '<' + url + '$3|$2>')

    return body
  }

  slack.prepareAttachmentTextForCreate = function(page, user) {
    var body = page.revision.body
    if (body.length > 2000) {
      body = body.substr(0, 2000) + '...'
    }

    return this.convertMarkdownToMrkdwn(body)
  }

  slack.prepareAttachmentTextForUpdate = function(page, user, previousRevision) {
    var diff = require('diff')
    var diffText = ''

    diff.diffLines(previousRevision.body, page.revision.body).forEach(function(line) {
      debug('diff line', line)
      var value = line.value.replace(/\r\n|\r/g, '\n')
      if (line.added) {
        diffText += sprintf(':pencil2: ...\n%s', line.value)
      } else if (line.removed) {
        // diffText += '-' + line.value.replace(/(.+)?\n/g, '- $1\n');
        // 1以下は無視
        if (line.count > 1) {
          diffText += sprintf(':wastebasket: ... %s lines\n', line.count)
        }
      } else {
        // diffText += '...\n';
      }
    })

    debug('diff is', diffText)

    return diffText
  }

  slack.prepareSlackMessage = function(page, user, channel, updateType, previousRevision) {
    var config = crowi.getConfig()
    var url = config.crowi['app:url'] || ''
    var body = page.revision.body

    if (updateType == 'create') {
      body = this.prepareAttachmentTextForCreate(page, user)
    } else {
      body = this.prepareAttachmentTextForUpdate(page, user, previousRevision)
    }

    var attachment = {
      color: '#263a3c',
      author_name: '@' + user.username,
      author_link: url + '/user/' + user.username,
      author_icon: user.image,
      title: page.path,
      title_link: url + '/' + page._id,
      text: body,
      mrkdwn_in: ['text'],
    }
    if (user.image) {
      attachment.author_icon = user.image
    }

    var message = {
      channel: '#' + channel,
      username: 'Crowi',
      text: this.getSlackMessageText(page, user, updateType),
      attachments: [attachment],
    }

    return message
  }

  slack.getSlackMessageText = function(page, user, updateType) {
    let text
    const config = crowi.getConfig()
    const url = config.crowi['app:url'] || ''

    const pageLink = `<${url}/${page._id}|${page.path}>`
    if (updateType == 'create') {
      text = sprintf(':white_check_mark: %s created a new page! %s', user.username, pageLink)
    } else {
      text = sprintf(':up: %s updated %s', user.username, pageLink)
    }

    return text
  }

  return slack
}
