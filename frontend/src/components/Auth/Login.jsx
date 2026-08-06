  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const res = await api.post('/login/', {
        email: form.email,
        password: form.password
      })

      localStorage.setItem('token', res.data.token)
      localStorage.setItem('refresh', res.data.refresh)

      // Limpiamos el nombre anterior para que no quede el de otra cuenta
      localStorage.removeItem('nombre')

      // Guardamos el nombre si la API lo devuelve
      if (res.data.nombre) {
        localStorage.setItem('nombre', res.data.nombre)
      }

      const nombre = res.data.nombre
      const saludo = nombre
        ? `¡Bienvenido de vuelta, ${nombre.split(' ')[0]}! 👋`
        : '¡Inicio de sesión exitoso! 👋'

      setToast(saludo)
      setTimeout(() => navigate('/'), 2000)

    } catch (err) {
      setError('Credenciales incorrectas')
    } finally {
      setCargando(false)
    }
  }