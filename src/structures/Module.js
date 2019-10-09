module.exports = class Module {
  constructor (name, client) {
    this.name = name
    this.client = client

    this.toggleable = true
    this.defaultState = true // Default active state
    this.defaultValues = {} // Default values
  }

  // Helpers
  get _guilds () {
    return this.client.database.guilds
  }

  buildProjection (fields) {
    return fields.split(' ').map(f => `modules.${this.name}.${f}`).join(' ')
  }

  validateState (state) {
    return this.toggleable ? typeof state !== 'boolean' ? this.defaultState : state : true
  }

  // Retrievers
  isActive (_guild) {
    if (!this.client.database) return this.defaultState
    return this._guilds.findOne(_guild, this.buildProjection('active')).then(g => {
      const mod = g.modules.get(this.name)
      return this.toggleable ? mod ? mod.active : this.defaultState : true
    })
  }

  retrieve (_guild, _projection = 'active values') {
    if (!this.client.database) return { active: this.defaultState, values: this.defaultValues }
    return this._guilds.findOne(_guild, this.buildProjection(_projection)).then(g => g.modules.get(this.name))
  }

  retrieveValue (_guild, value) {
    if (!this.client.database) return this.defaultValues[value]
    return this.asJSON(_guild, `values.${value}`).then(r => r.values[value])
  }

  retrieveValues (_guild, values) {
    if (!this.client.database) return this.defaultValues
    return this.asJSON(_guild, values.map(v => `values.${v}`).join(' ')).then(r => r.values)
  }

  async asJSON (_guild, _projection) {
    const mod = await this.retrieve(_guild, _projection)
    return {
      name: this.name,
      displayName: this.displayName || this.name,
      active: this.toggleable ? mod ? mod.active : this.defaultState : true,
      toggleable: this.toggleable,
      values: {
        ...this.defaultValues,
        ...(mod && mod.values ? mod.values : {})
      },
      input: this.specialInput
    }
  }

  // Validation
  validateValues (entity) {
    return Promise.resolve(entity)
  }

  // Updaters
  async updateValues (_guild, values) {
    if (!this.client.database) return
    return this.validateValues(values).then(entity => {
      const basePath = `modules.${this.name}.values`
      const updateEntries = Object.entries(values).reduce((o, [ k, v ]) => {
        o[`${basePath}.${k}`] = v
        return o
      }, {})
      return this._guilds.update(_guild, updateEntries)
    })
  }

  async updateState (_guild, state) {
    if (!this.client.database) return
    return this._guilds.update(_guild, {
      [`modules.${this.name}.active`]: this.validateState(state)
    })
  }
}
