// Evita que se abra una consola adicional en Windows en compilaciones release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tnxpcs_desktop_lib::run()
}
