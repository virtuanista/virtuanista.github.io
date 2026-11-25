<p align="center"><b>Español</b> · <a href="README.en.md">English</a></p>

# Portfolio de virtuanista

Web con los proyectos públicos de [virtuanista](https://github.com/virtuanista): **[virtuanista.github.io](https://virtuanista.github.io/)**.

![virtuanista](img/perfil/portada.png)

Tablero con filtros por tipo, tabla, pendientes, actividad y una ficha por proyecto. Sin dependencias.

- **Contenido:** `src/content.mjs` en español (por defecto) y `src/content.en.mjs` en inglés (`/en/`).
- **Datos:** `node scripts/build.mjs --sync` lee GitHub (fechas, commits, lenguajes, CI y versiones) y genera `dist/`.
- **Perfil:** el mismo comando genera `dist-profile/README.md` y las cifras en SVG (claro y oscuro).
- **Portadas:** `img/t/<id>.webp`, 800×450, una por proyecto.
- **Publicación:** GitHub Actions, en cada push y los lunes, sin crear commits.

## Licencia

Código bajo [MIT](LICENSE). Las capturas muestran proyectos con sus propias licencias y créditos.

<p align="center">
	Repositorio generado por <a href="https://github.com/virtuanista" target="_blank">virtu 🎣</a>
</p>

<p align="center">
	<img src="https://open.soniditos.com/cat_footer.svg" alt="Gatito" />
</p>

<p align="center">
	Copyright &copy; 2026
</p>

<p align="center">
	<a href="LICENSE"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=MIT&logoColor=d9e0ee&colorA=363a4f&colorB=b7bdf8" alt="Licencia MIT" /></a>
</p>
