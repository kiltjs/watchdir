
const { exec } = require('child_process')
const path = require('path')

const minimatch = require('minimatch')

async function _reducePromises(promises_list, result) {
  const next = promises_list.shift()

  if (!next) return result

  return _reducePromises(promises_list,
    await next.run.call(next, result)
  )
}

function _round(num, decimals) {
  var _pow = Math.pow(10, decimals)
  return Math.round(num * _pow) / _pow
}

module.exports = {

  matchFilters (filters) {
      const _filters = filters.map( (pattern) => {
          return pattern[0] === '!'
              ? { exclusion: true, matches: minimatch.filter(pattern.substr(1)) }
              : { matches: minimatch.filter(pattern) }
      })

      return (filepath) => {
        var matched = false
        
        _filters.forEach( (_) => {
          if (_.exclusion ) {
            if ( matched && _.matches(filepath) ) matched = false
          } else if (!matched && _.matches(filepath) ) {
            matched = true
          }
            
        })
        
        return matched
      }
  },

  async reducePromises(promises_list) {
    return await _reducePromises(
      promises_list.map((run) => run instanceof Function ? { run } : run)
    )
  },

  reducePatterns(pattern_list) {
    const patterns = []
    var current = null

    pattern_list.forEach((param, i) => {
      if (i % 2) {
        current.command = param
        patterns.push(current)
      } else current = {
        pattern: param.trim(),
      }
    })

    return patterns
  },

  getFileENV(filepath, options = {}) {
    const { cwd = null } = options

    const parsed = path.parse(filepath)

    return {
      FILE_BASE: parsed.base,
      FILE_NAME: parsed.name,
      FILE_EXT: parsed.ext,
      FILE_PATH: path.relative(process.cwd(), cwd ? path.resolve(cwd, filepath) : filepath ),
      FILE_DIR: parsed.dir,
      FILE_CWDPATH: path.relative(process.cwd(), cwd ? path.resolve(cwd, filepath) : filepath ),
      FILE_CWDDIR: path.relative(process.cwd(), cwd ? path.resolve(cwd, parsed.dir) : parsed.dir) || '.',
      FILE_FULLPATH: cwd
        ? path.resolve(cwd, filepath)
        : path.resolve(process.cwd(), cwd, filepath)
      ,
    }
  },

  runCommand(command, options = {}) {
    return new Promise(function (resolve, reject) {
      let cp = exec(command, options, (err) => err ? reject(err) : resolve())

      if (options.stdout) cp.stdout.pipe(process.stdout)
      if (options.stderr || options.stdout) cp.stderr.pipe(process.stderr)
    })
  },

  getmSeconds (time) {
    if( time > 1000 ) return _round(time/1000, 2) + 's'
    return _round(time, 2) + 'ms'
  },

}
