use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:tnxpairing.db",
                    vec![Migration {
                        version: 1,
                        description: "tablas base: torneos, jugadores y rondas",
                        sql: include_str!("../migrations/0001_init.sql"),
                        kind: MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación de escritorio");
}
