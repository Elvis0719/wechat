class WechatConfig {
  constructor (
    config = {}
  ) {
    this.config = config
  }

  set(key, val) {
    this.config[key] = val
  }

  get (key) {
    return this.config[key]
  }
}
