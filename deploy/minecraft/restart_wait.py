"""Honor the game mod's persisted maintenance window across a container/host restart."""
import pathlib
import time


def seconds_left(marker: pathlib.Path, now: float) -> float:
    if not marker.exists():
        return 0
    try:
        remaining = int(marker.read_text().strip()) / 1000 - now
    except (ValueError, OSError):
        raise ValueError('Invalid quiby-restart-not-before marker')
    if remaining > 600:
        raise ValueError('Restart window exceeds ten minutes; inspect the host clock and marker')
    return max(0, remaining)


if __name__ == '__main__':
    marker = pathlib.Path('quiby-restart-not-before')
    while (delay := seconds_left(marker, time.time())) > 0:
        print(f'Quiby maintenance window: waiting {delay:.0f}s before Minecraft startup', flush=True)
        time.sleep(min(delay, 30))
    marker.unlink(missing_ok=True)
