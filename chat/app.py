import os
import uuid
from datetime import date
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, flash, redirect, url_for, abort, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Api, Resource
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_cors import CORS
import flask_praetorian
from werkzeug.security import generate_password_hash, check_password_hash
from util import url_has_allowed_host_and_scheme