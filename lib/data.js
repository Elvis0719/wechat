class WechatData {
  constructor () {
    this.data = {}
  }

  parse (data) {
    try {
      this.data = JSON.parse(data)
      return this.data
    } catch (error) {
      throw new Error('数据异常')
    }
  }
}

module.exports = {
  WechatData
}
