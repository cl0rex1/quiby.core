# Обновление сервера до 6.1.14 (тестовая)

Minecraft 1.21.1 / NeoForge 21.1.250. Остановите сервер и сохраните резервную копию мира, mods и конфигов.

1. Замените старый Quiby JAR на mods/quiby-1.21.1-1.1.11.jar из архива. Не оставляйте две версии в mods. Off Balance остаётся 2.0, Sable и Sable Player Ragdoll остаются прежними.
2. В config/offbalance-server.toml установите в соответствующих секциях:

```toml
[balance]
balanceEnabled = false

[hurtProxy]
hurtProxyEnabled = true
hurtProxyMobsTarget = true

[recovery]
recoveryGateEnabled = false
```

3. В config/quiby-server.toml:

```toml
[ragdoll]
onDamage = true
minDamage = 9.0
onExplosion = true
cooldownTicks = 20
```

4. Если эти файлы существуют в <level-name>/serverconfig/, внесите изменения и туда. Остальные настройки сохраняйте. defaultconfigs — шаблоны для новых миров.
5. Запустите сервер. Игрокам обновить сборку до 6.1.14 через лаунчер.

Рэгдолл от урона: минимум 9 единиц (4.5 сердца) за один удар после защиты. Реакции на область взрыва независимы. Импульс взрыва усилен на 15%; предел итоговой скорости сохранён.

recoveryGateEnabled=false снимает дополнительные блокировки Off Balance и возвращает штатные правила Sable, включая его собственные minDismountTicks/duration. Старые параметры manualDismount можно оставить: при выключенной recovery gate они больше не блокируют выход. Это не обещание мгновенного подъёма; штатная минимальная задержка Sable сохраняется.

Проверьте подъём по Shift на боку/спине, порог урона и отбрасывание от взрыва. Автоматические проверки прошли, игровое подтверждение требуется.
API, Docker и Cloudflare менять не нужно. Для отката восстановите резервную копию целиком при остановленном сервере.
