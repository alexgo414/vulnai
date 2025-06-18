#!/usr/bin/env python3
"""
Script para ejecutar todas las pruebas de seguridad
"""
import os
import sys
import unittest

def run_all_security_tests():
    """Ejecutar todas las pruebas de seguridad"""
    print("🔒 EJECUTANDO SUITE COMPLETA DE PRUEBAS DE SEGURIDAD")
    print("=" * 60)
    
    # Establecer variable de entorno para tests
    os.environ['FLASK_TESTING'] = 'true'
    
    # Descubrir y ejecutar todos los tests de seguridad
    test_loader = unittest.TestLoader()
    test_suite = test_loader.discover('tests', pattern='test_security*.py')
    
    # Ejecutar tests con verbose output
    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    result = runner.run(test_suite)
    
    # Resumen de resultados
    print("\n" + "=" * 60)
    print("RESUMEN DE PRUEBAS DE SEGURIDAD")
    print("=" * 60)
    print(f"Tests ejecutados: {result.testsRun}")
    print(f"Fallos: {len(result.failures)}")
    print(f"Errores: {len(result.errors)}")
    
    if result.failures:
        print("\n❌ FALLOS ENCONTRADOS:")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback.split('AssertionError:')[-1].strip()}")
    
    if result.errors:
        print("\n💥 ERRORES ENCONTRADOS:")
        for test, traceback in result.errors:
            print(f"  - {test}: Error en ejecución")
    
    if not result.failures and not result.errors:
        print("\n✅ TODOS LOS TESTS DE SEGURIDAD PASARON")
    
    return result.wasSuccessful()

if __name__ == '__main__':
    success = run_all_security_tests()
    sys.exit(0 if success else 1)