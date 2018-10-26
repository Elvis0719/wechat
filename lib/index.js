const request = require('superagent')
const path = require('path')
const fs = require('fs')
const { WechatData } = require('./data')

class Wechat {
  constructor () {
  }

  getIP (config) {
    const {text} = await request
      .get(`https://api.weixin.qq.com/cgi-bin/getcallbackip?access_token=${config.get('access_token')}`)
    const data = new WechatData()
    return data.parse(text)
  }
}

String.prototype.getByteLength = function () {
  let len = 0
  let charCode = -1
  for (let i = 0; i < this.length; i++) {
    charCode = this.charCodeAt(i)
    if (charCode < 0x007f) len++
    else if ((0x0080 <= charCode) && (charCode <= 0x07ff)) len += 2
    else if ((0x0800 <= charCode) && (charCode <= 0xffff)) len += 3
    else len += 4
  }
  return len
}

class Menu extends Wechat {
  constructor () {
    super()
  }

  check (button) {
    if (!button) throw new Error('缺少 button 字段')
    for (let val of button) {
      if (!val.type) throw new Error('button 数组中缺少 type 字段')
      if (!name) throw new Error('button 数组中缺少 name 字段')
      if (val.type === 'click' && !val.key) throw new Error('button 数组中缺少 key 字段')
      if (val.type === 'view' && !val.url) throw new Error('button 数组中缺少 url 字段')
      if (['media_id', 'view_limited'].indexOf(val.type) >= 0 && !val.media_id) throw new Error('button 数组中缺少 media_id 字段')
      if (val.type === 'miniprogram') {
        if (!val.url) throw new Error('button 数组中缺少 url 字段')
        if (!val.appid) throw new Error('button 数组中缺少 appid 字段')
        if (!val.pagepath) throw new Error('button 数组中缺少 pagepath 字段')
      }
      if (val.key.getByteLength() > 128) throw new Error('菜单 key 值不能超过 128 字节')
      if (val.url.getByteLength() > 1024) throw new Error('菜单 url 值不能超过 1024 字节')
    }
  }

  async create (config, input) {
    const button = input.get('button')
    this.check(button)
    const {text} = await request
      .post(`https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${config.get('access_token')}`)
      .send({ button })
    const data = new WechatData()
    return data.parse(text)
  }

  async fetch (config) {
    const {text} = await request
      .get(`https://api.weixin.qq.com/cgi-bin/menu/get?access_token=${config.get('access_token')}`)
    const data = new WechatData()
    return data.parse(text)
  }

  async delete (config) {
    const {text} = await request
      .get(`https://api.weixin.qq.com/cgi-bin/menu/delete?access_token=${config.get('access_token')}`)
    const data = new WechatData()
    return data.parse(text)
  }

  async fetchConfig (config) {
    const {text} = await request
      .get(`https://api.weixin.qq.com/cgi-bin/get_current_selfmenu_info?access_token=${config.get('access_token')}`)
    const data = new WechatData()
    return data.parse(text)
  }
}

class ConditionalMenu extends Menu {
  constructor () {
    super()
  }

  async create (config, input) {
    const button = input.get('button')
    this.check(button)
    const matchrule = input.get('matchrule') || {}
    const {text} = await request
      .post(`https://api.weixin.qq.com/cgi-bin/menu/addconditional?access_token=${config.get('access_token')}`)
      .send({ button, matchrule })
    const data = new WechatData()
    return data.parse(text)
  }

  async deleteConditional (config, input) {
    const menuid = input.get('menuid')
    if (!menuid) throw new Error('缺少 menuid 字段')
    const {text} = await request
      .post(`https://api.weixin.qq.com/cgi-bin/menu/delconditional?access_token=${config.get('access_token')}`)
      .send({ menuid })
    const data = new WechatData()
    return data.parse(text)
  }

  async match (config, input) {
    const user_id = input.get('user_id')
    if (!user_id) throw new Error('缺少 user_id 字段')
    const {text} = await request
      .post(`https://api.weixin.qq.com/cgi-bin/menu/trymatch?access_token=${config.get('access_token')}`)
      .send({ user_id })
    const data = new WechatData()
    return data.parse(text)
  }
}

class Material extends Wechat {
  constructor () {
    super()
    this.type = null
  }

  check (input) {
    if (['news', 'image', 'voice', 'video', 'thumb'].indexOf(this.type) < 0) throw new Error('未知的 type 类型')
    if (this.type === 'news') {
      const articles = input.get('articles')
      if (!articles) throw new Error('缺少 articles 字段')
      for (let article of articles) {
        if (!article.title) throw new Error('articles 数组中缺少 title 字段')
        if (!article.thumb_media_id) throw new Error('articles 数组中缺少 thumb_media_id 字段')
        if (article.show_cover_pic !== 0 && article.show_cover_pic !== 1) throw new Error('articles 数组中缺少 show_cover_pic 字段')
        if (!article.content) throw new Error('articles 数组中缺少 content 字段')
        if (!article.content_source_url) throw new Error('articles 数组中缺少 content_source_url 字段')
      }
    } else {
      if (!input.get('path')) throw new Error('缺少 path 字段')
      if (this.type === 'video') {
        if (!input.get('title')) throw new Error('缺少 title 字段')
        if (!input.get('introduction')) throw new Error('缺少 introduction 字段')
      }
    }
  }

  async create (config, input) {
    this.type = input.get('type')
    this.check(input)
    const data = new WechatData()
    const file = {}
    if (this.type !== 'news') {
      file.path = input.get('path')
      file.name = path.basename(file.path)
      file.size = fs.statSync(file.path).size
    }
    if (this.type === 'news') {
      const {text} = await request
        .post(`https://api.weixin.qq.com/cgi-bin/material/add_news?access_token=${config.get('access_token')}`)
        .send({ articles: input.get('articles') })
      return data.parse(text)
    } else if (this.type === 'video') {
      const {text} = await request
        .post(`https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${config.get('access_token')}&type=${this.type}`)
        .attach('media', file.path)
        .field('filename', file.name)
        .field('filelength', file.size)
        .field('description', JSON.stringify({
          title: input.get('title'),
          introduction: input.get('introduction')
        }))
      return data.parse(text)
    } else {
      const {text} = await request
        .post(`https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${config.get('access_token')}&type=${this.type}`)
        .attach('media', file.path)
        .field('filename', file.name)
        .field('filelength', file.size)
      return data.parse(text)
    }
  }

  async uploadimg (config, input) {
    const file = {}
    file.path = input.get('path')
    if (!file.path) throw new Error('缺少 path 字段')
    file.name = path.basename(file.path)
    file.size = fs.statSync(file.path).size
    const {text} = await request
      .post(`https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${config.get('access_token')}`)
      .attach('media', file.path)
      .field('filename', file.name)
      .field('filelength', file.size)
    const data = new WechatData()
    return data.parse(text)
  }

  async fetch (config, input) {
    if (!input.get('media_id')) throw new Error('缺少 media_id 字段')
    const {text} = await request
      .post(`https://api.weixin.qq.com/cgi-bin/material/get_material?access_token=${config.get('access_token')}`)
      .send({ media_id: input.get('media_id') })
    const data = new WechatData()
    return data.parse(text)
  }

  async delete (config, input) {
    if (!input.get('media_id')) throw new Error('缺少 media_id 字段')
    const {text} = await request
      .post(`https://api.weixin.qq.com/cgi-bin/material/del_material?access_token=${config.get('access_token')}`)
      .send({ media_id: input.get('media_id') })
    const data = new WechatData()
    return data.parse(text)
  }

  async updateNews (config, input) {
    this.type = 'news'
    this.check(input)
    if (!input.get('media_id')) throw new Error('缺少 media_id 字段')
    if (!input.get('index')) throw new Error('缺少 index 字段')
    const {text} = await request
      .post(`https://api.weixin.qq.com/cgi-bin/material/update_news?access_token=${config.get('access_token')}`)
      .send({
        media_id: input.get('media_id'),
        index: input.get('index'),
        articles: input.get('articles') 
      })
    const data = new WechatData()
    return data.parse(text)
  }
}
