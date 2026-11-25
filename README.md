# Portfolio de virtuanista

Web con los proyectos públicos de [virtuanista](https://github.com/virtuanista) (Pepe Alvar): **[virtuanista.github.io](https://virtuanista.github.io/)**.

![Panel](img/panel.png)

Panel técnico con tablero, tabla, pendientes, actividad y una ficha por proyecto. Sin dependencias.

- **Contenido:** `src/content.mjs` (concepto, tecnología, límites y capturas).
- **Datos:** `node scripts/build.mjs --sync` lee GitHub (fechas, commits, lenguajes, CI y versiones) y genera `dist/`.
- **Perfil:** el mismo comando genera `dist-profile/README.md`.
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
