FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --create-home quiby \
    && install -d -o 10001 -g 10001 /data
COPY --chown=10001:10001 . /opt/quiby/
RUN chmod +x /opt/quiby/start.sh
USER 10001:10001
ENV SERVER_DIR=/data
WORKDIR /data
ENTRYPOINT ["/opt/quiby/start.sh"]
