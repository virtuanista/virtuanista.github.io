<p align="center"><a href="README.md">Español</a> · <b>English</b></p>

# virtuanista's portfolio

Website with the public projects of [virtuanista](https://github.com/virtuanista): **[virtuanista.github.io](https://virtuanista.github.io/)**.

![virtuanista](img/perfil/portada.png)

A board with filters by type, a table, pending work, activity and a page for each project. No dependencies.

- **Content:** `src/content.mjs` in Spanish (default) and `src/content.en.mjs` in English (`/en/`).
- **Data:** `node scripts/build.mjs --sync` reads GitHub (dates, commits, languages, CI and releases) and generates `dist/`.
- **Profile:** the same command generates `dist-profile/README.md` and the figures as SVG (light and dark).
- **Covers:** `img/t/<id>.webp`, 800×450, one per project.
- **Publishing:** GitHub Actions, on every push and on Mondays, without creating commits.

## License

Code under [MIT](LICENSE). The screenshots show projects with their own licenses and credits.

<p align="center">
	Repository made by <a href="https://github.com/virtuanista" target="_blank">virtu 🎣</a>
</p>

<p align="center">
	<img src="https://open.soniditos.com/cat_footer.svg" alt="Cat" />
</p>

<p align="center">
	Copyright &copy; 2026
</p>

<p align="center">
	<a href="LICENSE"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=MIT&logoColor=d9e0ee&colorA=363a4f&colorB=b7bdf8" alt="MIT License" /></a>
</p>
