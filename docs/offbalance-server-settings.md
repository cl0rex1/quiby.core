# Актуальные настройки ragdoll — 6.1.14

Quiby 1.1.11: minDamage = 9.0 в секции [ragdoll] quiby-server.toml.
Это 4.5 сердца за один удар после защиты; мелкий урон не накапливается.
Реакции на область взрыва независимы, импульс увеличен на 15%.

В offbalance-server.toml:

```toml
[balance]
balanceEnabled = false

[hurtProxy]
hurtProxyEnabled = true
hurtProxyMobsTarget = true

[recovery]
recoveryGateEnabled = false
```

Отключена дополнительная блокировка Off Balance. Восстановление работает по штатным
правилам Sable, включая его минимальное время до выхода. Прежние manualDismount
ограничения больше не блокируют выход. Игровое подтверждение требуется.

Обновите серверный Quiby JAR, config и существующие world/serverconfig файлы.
Шаблоны defaultconfigs не обновляют существующий мир.
[Полная инструкция](server-update-6.1.14.md).

Возврат к offline-телу сохраняется: позиция записывается раз в секунду и перед входом.
Для выгруженного тела используется последняя известная позиция.
