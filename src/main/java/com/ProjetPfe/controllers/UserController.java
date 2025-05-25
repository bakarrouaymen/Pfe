package com.ProjetPfe.controllers;

import com.ProjetPfe.model.User;
import com.ProjetPfe.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin
public class UserController {

    @Autowired
    private UserRepository userRepository;

    // Liste tous les users
    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Ajouter un user
    @PostMapping
    public User createUser(@RequestBody User user) {
        return userRepository.save(user);
    }

    // Récupérer un user par id
    @GetMapping("/{id}")
    public User getUserById(@PathVariable Long id) {
        return userRepository.findById(id).orElse(null);
    }
}
